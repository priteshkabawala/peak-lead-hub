import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPhone } from '@/lib/phone'
import { openInitialSchedule, todayISO } from '@/lib/schedule'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * One-time backfill for leads that existed before scheduling shipped.
 *
 * Re-validates every open lead's phone with the new checker, parks the ones
 * that fail, and opens a first callback for the ones that pass. Idempotent:
 * leads that already have an open callback are left alone.
 *
 * Admin session required. Safe to re-run.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'not configured' }, { status: 500 })

  const supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const h = req.headers.get('authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await supa.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supa.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

  const CLOSED = ['Meeting Booked', 'Cold']
  const { data: leads } = await supa
    .from('leads').select('id,phone,status,parked_at')
    .not('status', 'in', `(${CLOSED.map(s => `"${s}"`).join(',')})`)

  const out = { checked: 0, scheduled: 0, parked: 0, alreadyOpen: 0 }

  for (const lead of leads ?? []) {
    out.checked++

    const { data: open } = await supa
      .from('call_schedule').select('id')
      .eq('lead_id', lead.id).is('completed_at', null).maybeSingle()
    if (open) { out.alreadyOpen++; continue }

    const verdict = await verifyPhone(lead.phone)

    if (!verdict.ok) {
      await supa.from('leads').update({
        phone_valid: false,
        phone_e164: verdict.e164,
        phone_type: verdict.type,
        parked_at: lead.parked_at ?? new Date().toISOString(),
        parked_reason: verdict.reason,
        status: 'Invalid Phone',
      }).eq('id', lead.id)
      out.parked++
      continue
    }

    await supa.from('leads').update({
      phone_valid: true,
      phone_e164: verdict.e164,
      phone_type: verdict.type,
      parked_at: null,
      parked_reason: null,
    }).eq('id', lead.id)
    await openInitialSchedule(lead.id, todayISO())
    out.scheduled++
  }

  return NextResponse.json({ ok: true, ...out })
}
