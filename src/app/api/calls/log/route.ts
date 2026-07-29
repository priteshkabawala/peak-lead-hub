import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { outcomeMeta } from '@/lib/supabase'
import { advanceSchedule } from '@/lib/schedule'
import { notifyAdminOfClosure } from '@/lib/notify-lead'

export const runtime = 'nodejs'

/**
 * Log a call attempt and advance the callback schedule in one transaction-ish
 * step. Runs server-side so the schedule engine can use the service role and
 * the caller cannot desync the ladder from the attempt log.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: 'not configured' }, { status: 500 })

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supa = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: { user } } = await supa.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supa.from('profiles').select('id,name,role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { leadId, outcome, note, callbackDate } = await req.json().catch(() => ({}))
  if (!leadId || !outcome) return NextResponse.json({ error: 'leadId and outcome required' }, { status: 400 })

  const meta = outcomeMeta(outcome)
  if (!meta) return NextResponse.json({ error: `unknown outcome: ${outcome}` }, { status: 400 })

  const { data: lead } = await supa.from('leads').select('*').eq('id', leadId).single()
  if (!lead) return NextResponse.json({ error: 'lead not found' }, { status: 404 })

  // 1. record the attempt
  const { error: attErr } = await supa.from('call_attempts').insert([{
    lead_id: leadId,
    caller_id: profile.id,
    caller_name: profile.name,
    outcome,
    note: (note ?? '').trim() || null,
  }])
  if (attErr) return NextResponse.json({ error: attErr.message }, { status: 500 })

  // 2. move the schedule
  const { next, exhausted } = await advanceSchedule({
    leadId,
    behaviour: meta.schedule,
    customDate: meta.askDate ? (callbackDate ?? null) : null,
  })

  // 3. update the lead. 4 attempts with no contact ends the same way as an
  //    explicit "not interested": Cold, and the admin gets one last try.
  const status = exhausted ? 'Cold' : meta.status
  const patch: Record<string, unknown> = { status }
  if (meta.adminAlert === 'park') {
    patch.parked_at = new Date().toISOString()
    patch.parked_reason = 'Caller reported wrong / bad number'
    patch.phone_valid = false
  }
  await supa.from('leads').update(patch).eq('id', leadId)

  // 4. tell the admin when a lead closes
  const alert = exhausted ? 'final_try' : meta.adminAlert
  if (alert) {
    try {
      await notifyAdminOfClosure({
        leadId,
        leadName: `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim(),
        phone: lead.phone ?? '',
        kind: alert,
        detail: exhausted ? '4 attempts made, never reached' : meta.label,
      })
    } catch (e) {
      console.error('[calls/log] admin alert failed:', (e as Error).message)
    }
  }

  await supa.from('audit_logs').insert([{
    user_id: profile.id, user_name: profile.name, user_role: profile.role,
    action: 'Call logged', entity_type: 'lead', entity_id: String(leadId),
    details: { outcome: meta.label, status, next_due: next?.due_on ?? null, exhausted },
  }])

  return NextResponse.json({
    ok: true,
    status,
    exhausted,
    nextDue: next?.due_on ?? null,
    attemptNo: next?.attempt_no ?? null,
  })
}
