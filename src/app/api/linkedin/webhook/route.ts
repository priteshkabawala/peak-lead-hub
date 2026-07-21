import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { runLeadAutomation } from '@/lib/notify-lead'

// Webhook intake for LinkedIn leads relayed via a bridge service (LeadsBridge,
// Make, Zapier, etc.) that holds LinkedIn's own approved Lead Sync access.
// This is a stand-in for the native LinkedIn OAuth sync (src/lib/linkedin.ts)
// until our own Lead Sync API application is approved — same automation
// fires either way (guide email, WhatsApp, admin/caller notifications).
//
// Auth: shared secret via `?secret=` query param or `x-webhook-secret` header
// (configure whichever LeadsBridge's webhook action supports).

export const runtime = 'nodejs'

function validPhone(p: string) {
  const c = (p || '').replace(/[\s\-()]/g, '')
  return /^(07\d{9}|01\d{8,9}|02\d{9}|03\d{9}|0800\d{6,7}|\+447\d{9})$/.test(c)
}

// Normalise an incoming value to a real value or null. LeadsBridge sends
// unmapped fields as empty strings or the literal "{{token}}" placeholder,
// and sometimes the strings "null"/"undefined" — none should reach the CRM.
function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  if (/^\{\{.*\}\}$/.test(t)) return null            // unmapped merge token
  if (/^(null|undefined|n\/a|na|-)$/i.test(t)) return null
  return t
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

// Best-effort keyword match for custom LinkedIn form questions, same
// heuristic used by the native sync (src/lib/linkedin.ts).
function classifyCustomField(label: string): 'pension' | 'seniority' | 'age_range' | 'adviser' | null {
  const t = label.toLowerCase()
  if (t.includes('pension') || t.includes('investable assets')) return 'pension'
  if (t.includes('role') || t.includes('seniority') || t.includes('job level')) return 'seniority'
  if (t.includes('age')) return 'age_range'
  if (t.includes('adviser') || t.includes('advisor')) return 'adviser'
  return null
}

type Payload = {
  // Standard fields — declare these as Custom Fields in LeadsBridge and map them.
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  job_title?: string
  campaign_name?: string
  lead_id?: string // LinkedIn's lead response ID, for dedup — map if the bridge exposes it

  // Custom Lead Gen Form questions, declared as flat LeadsBridge fields with
  // exactly these names (map your LinkedIn questions onto them):
  pension?: string
  seniority?: string
  age_range?: string
  adviser?: string

  // Fallback: some bridges can send a nested object of { "question": "answer" };
  // anything here (or any unrecognised value above) is classified/kept in notes.
  custom_questions?: Record<string, string>
}

export async function POST(req: Request) {
  const reqUrl = new URL(req.url)
  const secret = process.env.LINKEDIN_WEBHOOK_SECRET
  const provided = reqUrl.searchParams.get('secret') || req.headers.get('x-webhook-secret')
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Payload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const cleanName = clean(body.name)
  const { first, last } = cleanName
    ? splitName(cleanName)
    : { first: clean(body.first_name) ?? '', last: clean(body.last_name) ?? '' }
  const phone = clean(body.phone) ?? ''
  const email = clean(body.email)
  const jobTitle = clean(body.job_title)
  const campaign = clean(body.campaign_name)
  const leadId = clean(body.lead_id)

  if (!first && !phone) {
    return NextResponse.json({ error: 'name or phone required' }, { status: 400 })
  }

  // Prefer the explicit flat fields; fall back to a nested custom_questions map.
  let pension = clean(body.pension)
  let seniority = clean(body.seniority)
  let ageRange = clean(body.age_range)
  let adviser = clean(body.adviser)
  const extraNotes: string[] = []

  for (const [label, raw] of Object.entries(body.custom_questions ?? {})) {
    const value = clean(raw)
    if (!value) continue
    const kind = classifyCustomField(label)
    if (kind === 'pension' && !pension) pension = value
    else if (kind === 'seniority' && !seniority) seniority = value
    else if (kind === 'age_range' && !ageRange) ageRange = value
    else if (kind === 'adviser' && !adviser) adviser = value
    else extraNotes.push(`${label}: ${value}`)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 })
  }
  const supabaseAdmin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // Dedup on LinkedIn's lead id when the bridge provides one.
  if (leadId) {
    const { data: existing } = await supabaseAdmin.from('leads').select('id').eq('linkedin_lead_id', leadId).maybeSingle()
    if (existing) return NextResponse.json({ ok: true, duplicate: true, leadId: existing.id })
  }

  const { data: inserted, error } = await supabaseAdmin.from('leads').insert([{
    date: new Date().toISOString().split('T')[0],
    first_name: first || 'Unknown',
    last_name: last || '',
    email,
    phone,
    phone_valid: validPhone(phone),
    campaign: campaign || 'LinkedIn',
    job_title: jobTitle,
    seniority, age_range: ageRange, pension, adviser,
    notes: extraNotes.length ? extraNotes.join(' · ') : null,
    status: 'New',
    linkedin_lead_id: leadId,
  }]).select('id').single()

  if (error || !inserted) {
    console.error('[linkedin/webhook] insert failed:', error?.message)
    return NextResponse.json({ error: 'Could not save lead' }, { status: 500 })
  }

  try {
    await runLeadAutomation(inserted.id)
  } catch (e) {
    console.error('[linkedin/webhook] automation failed (lead still saved):', (e as Error).message)
  }

  return NextResponse.json({ ok: true, leadId: inserted.id })
}
