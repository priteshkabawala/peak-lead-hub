import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { runLeadAutomation } from '@/lib/notify-lead'

// Public lead-intake endpoint for the marketing site forms.
// Inserts straight into the CRM `leads` table using the service-role key
// (the table has RLS enabled, so the anon key cannot insert directly).

export const runtime = 'nodejs'

// Mirrors the UK phone check used in the CRM dashboard (src/app/crm/page.tsx).
function validPhone(p: string) {
  const c = p.replace(/[\s\-()]/g, '')
  return /^(07\d{9}|01\d{8,9}|02\d{9}|03\d{9}|0800\d{6,7}|\+447\d{9})$/.test(c)
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

type Payload = {
  // either a single `name` field, or first/last
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  postcode?: string
  advice?: string // "Type of advice needed"
  message?: string
  preferred_date?: string
  preferred_time?: string
  source?: string // which form / page submitted
  company?: string // honeypot — must stay empty
}

export async function POST(req: Request) {
  let body: Payload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Honeypot: real users never fill the hidden `company` field.
  if (body.company && body.company.trim() !== '') {
    // Pretend success so bots don't learn the trap.
    return NextResponse.json({ ok: true })
  }

  const { first, last } = body.name
    ? splitName(body.name)
    : { first: (body.first_name || '').trim(), last: (body.last_name || '').trim() }

  const phone = (body.phone || '').trim()
  const email = (body.email || '').trim() || null

  if (!first) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  }
  if (!phone) {
    return NextResponse.json({ error: 'Please enter a phone number.' }, { status: 400 })
  }

  // Build a readable notes blob from the extra fields the CRM has no column for.
  const noteParts: string[] = []
  if (body.advice) noteParts.push(`Advice needed: ${body.advice}`)
  if (body.postcode) noteParts.push(`Postcode: ${body.postcode}`)
  if (body.preferred_date || body.preferred_time) {
    noteParts.push(`Preferred: ${[body.preferred_date, body.preferred_time].filter(Boolean).join(' ')}`)
  }
  if (body.message) noteParts.push(`Message: ${body.message}`)
  const notes = noteParts.length ? noteParts.join('\n') : null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('[leads] Missing Supabase service-role configuration')
    return NextResponse.json(
      { error: 'Server is not configured to accept submissions yet.' },
      { status: 500 },
    )
  }

  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: inserted, error } = await supabaseAdmin
    .from('leads')
    .insert([
      {
        first_name: first,
        last_name: last || '',
        email,
        phone,
        phone_valid: validPhone(phone),
        campaign: body.source ? `Website — ${body.source}` : 'Website',
        notes,
        status: 'New',
      },
    ])
    .select('id')
    .single()

  if (error) {
    console.error('[leads] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not save your details. Please try again.' }, { status: 500 })
  }

  // Best-effort: run the full new-lead automation (guide email, phone check,
  // admin + caller alerts). Never block the visitor on this.
  if (inserted?.id != null) {
    try {
      await runLeadAutomation(inserted.id)
    } catch (e) {
      console.error('[leads] automation failed (lead still saved):', (e as Error).message)
    }
  }

  return NextResponse.json({ ok: true })
}
