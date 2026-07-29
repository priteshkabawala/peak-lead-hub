import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPhone } from '@/lib/phone'
import { closeSchedule, openInitialSchedule, requeue, todayISO } from '@/lib/schedule'

export const runtime = 'nodejs'

async function requireAdmin(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const h = req.headers.get('authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) return null
  const { data: { user } } = await supa.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supa.from('profiles').select('id,name,role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return { supa, profile }
}

/**
 * Admin actions on the parked queue.
 *
 *  park          hide a lead from the caller and close its callback
 *  unpark        put it back in the queue as-is
 *  update_phone  replace the number; if it validates, the lead un-parks and
 *                a fresh callback opens for the next working day
 *  discard       close the lead permanently (Cold)
 */
export async function POST(req: Request) {
  const ctx = await requireAdmin(req)
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { supa, profile } = ctx

  const { leadId, action, phone, reason } = await req.json().catch(() => ({}))
  if (!leadId || !action) return NextResponse.json({ error: 'leadId and action required' }, { status: 400 })

  const { data: lead } = await supa.from('leads').select('*').eq('id', leadId).single()
  if (!lead) return NextResponse.json({ error: 'lead not found' }, { status: 404 })

  const audit = (action: string, details: Record<string, unknown>) =>
    supa.from('audit_logs').insert([{
      user_id: profile.id, user_name: profile.name, user_role: profile.role,
      action, entity_type: 'lead', entity_id: String(leadId), details,
    }])

  if (action === 'park') {
    await closeSchedule(leadId)
    await supa.from('leads').update({
      parked_at: new Date().toISOString(),
      parked_reason: reason || 'Parked by admin',
    }).eq('id', leadId)
    await audit('Lead parked', { reason: reason || 'Parked by admin' })
    return NextResponse.json({ ok: true, parked: true })
  }

  if (action === 'unpark') {
    await supa.from('leads').update({
      parked_at: null, parked_reason: null,
      status: lead.status === 'Invalid Phone' ? 'New' : lead.status,
    }).eq('id', leadId)
    const row = await requeue(leadId, 'requeued')
    await audit('Lead returned to queue', { due_on: row?.due_on ?? null })
    return NextResponse.json({ ok: true, parked: false, dueOn: row?.due_on ?? null })
  }

  if (action === 'update_phone') {
    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })
    const verdict = await verifyPhone(phone)

    await supa.from('leads').update({
      phone,
      phone_e164: verdict.e164,
      phone_type: verdict.type,
      phone_valid: verdict.ok,
      parked_at: verdict.ok ? null : new Date().toISOString(),
      parked_reason: verdict.ok ? null : verdict.reason,
      status: verdict.ok ? 'New' : 'Invalid Phone',
    }).eq('id', leadId)

    let dueOn: string | null = null
    if (verdict.ok) {
      await closeSchedule(leadId)
      const row = await openInitialSchedule(leadId, todayISO())
      dueOn = (row as { due_on?: string } | null)?.due_on ?? null
    }

    await audit('Lead phone updated', {
      old_phone: lead.phone, new_phone: phone,
      accepted: verdict.ok, reason: verdict.reason,
    })
    return NextResponse.json({ ok: verdict.ok, verdict, dueOn })
  }

  if (action === 'discard') {
    await closeSchedule(leadId)
    await supa.from('leads').update({
      status: 'Cold', parked_at: null,
      parked_reason: reason || 'Discarded by admin',
    }).eq('id', leadId)
    await audit('Lead discarded', { reason: reason || 'Discarded by admin' })
    return NextResponse.json({ ok: true, discarded: true })
  }

  return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 })
}
