import { createClient } from '@supabase/supabase-js'

// Callback schedule engine.
//
// Cadence is outcome-driven: each logged attempt schedules the next call
// +3 days from when the call actually happened, so a late call shifts the
// rest of the ladder instead of stacking overdue rows.
//
// Any due date landing on a weekend moves to the following Monday. The CRM
// operates Europe/London.

export const CADENCE_DAYS = 3
export const MAX_ATTEMPTS = 4
const TZ = 'Europe/London'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Today in Europe/London as YYYY-MM-DD, independent of server timezone. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

function parseISO(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}
function fmtISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Saturday and Sunday roll forward to Monday. */
export function shiftToWorkingDay(iso: string): string {
  const d = parseISO(iso)
  const dow = d.getUTCDay() // 0 Sun … 6 Sat
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2)
  else if (dow === 0) d.setUTCDate(d.getUTCDate() + 1)
  return fmtISO(d)
}

/** Add days then apply the weekend rule. */
export function addDaysWorking(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return shiftToWorkingDay(fmtISO(d))
}

/** Due date for the first call: today, or Monday if today is Fri/Sat/Sun. */
export function firstCallDue(from: string = todayISO()): string {
  const d = parseISO(from)
  // Friday intake gets Monday too: a Friday-afternoon lead rung on Friday is
  // fine, but the cadence should not put attempt 2 in the weekend dead zone.
  if (d.getUTCDay() === 5) return addDaysWorking(from, 3)
  return shiftToWorkingDay(from)
}

export type ScheduleRow = {
  id: number
  lead_id: number
  attempt_no: number
  due_on: string
  due_reason: string
  completed_at: string | null
}

/** Open the first callback for a lead. No-op if one is already open. */
export async function openInitialSchedule(leadId: number, from?: string) {
  const supa = admin()
  const { data: existing } = await supa
    .from('call_schedule').select('id')
    .eq('lead_id', leadId).is('completed_at', null).maybeSingle()
  if (existing) return existing

  const { data } = await supa.from('call_schedule').insert([{
    lead_id: leadId,
    attempt_no: 1,
    due_on: firstCallDue(from),
    due_reason: 'initial',
  }]).select().single()
  return data
}

/**
 * Close the open row after an attempt is logged and open the next one.
 *
 * `advance` decides what happens next based on the outcome:
 *   continue  → next attempt +3 working-adjusted days (or customDate)
 *   stop      → no further callbacks (booked, cold, invalid)
 * Returns the new row, or null when the ladder ended.
 */
export async function advanceSchedule(opts: {
  leadId: number
  behaviour: 'continue' | 'stop'
  customDate?: string | null
  reason?: string
}): Promise<{ next: ScheduleRow | null; exhausted: boolean }> {
  const supa = admin()
  const now = new Date().toISOString()

  const { data: open } = await supa
    .from('call_schedule').select('*')
    .eq('lead_id', opts.leadId).is('completed_at', null).maybeSingle()

  if (open) {
    await supa.from('call_schedule').update({ completed_at: now }).eq('id', open.id)
  }

  if (opts.behaviour === 'stop') return { next: null, exhausted: false }

  const attemptNo = (open?.attempt_no ?? 0) + 1
  if (attemptNo > MAX_ATTEMPTS) return { next: null, exhausted: true }

  const due = opts.customDate
    ? shiftToWorkingDay(opts.customDate)
    : addDaysWorking(todayISO(), CADENCE_DAYS)

  const { data: next } = await supa.from('call_schedule').insert([{
    lead_id: opts.leadId,
    attempt_no: attemptNo,
    due_on: due,
    due_reason: opts.reason ?? (opts.customDate ? 'custom' : 'cadence'),
  }]).select().single()

  return { next: next as ScheduleRow, exhausted: false }
}

/** Put a lead back in the queue (missed meeting, or admin requeue). */
export async function requeue(leadId: number, reason: 'missed_meeting' | 'requeued') {
  const supa = admin()
  const { data: open } = await supa
    .from('call_schedule').select('id')
    .eq('lead_id', leadId).is('completed_at', null).maybeSingle()
  if (open) return null // already queued, leave it alone

  const { count } = await supa
    .from('call_attempts').select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)

  const { data } = await supa.from('call_schedule').insert([{
    lead_id: leadId,
    attempt_no: Math.min((count ?? 0) + 1, MAX_ATTEMPTS),
    due_on: addDaysWorking(todayISO(), 1),
    due_reason: reason,
  }]).select().single()
  return data
}

/** Close any open callback, used when a lead is parked or closed. */
export async function closeSchedule(leadId: number) {
  const supa = admin()
  await supa.from('call_schedule')
    .update({ completed_at: new Date().toISOString() })
    .eq('lead_id', leadId).is('completed_at', null)
}
