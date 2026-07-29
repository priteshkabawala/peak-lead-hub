import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { todayISO, requeue } from '@/lib/schedule'
import { outcomeMeta } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// Daily admin digest.
//   ?when=morning (09:00) – requeue missed meetings, then what is pending today
//   ?when=evening (21:00) – what the caller actually achieved
//
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. The Hobby plan
// allows two once-daily jobs, which is why the missed-meeting requeue runs
// inside the morning digest rather than as a third job.

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const row = (l: string, v: string, colour = '#323338') =>
  `<tr><td style="padding:7px 12px 7px 0;font-size:13px;color:#676879">${l}</td>
   <td style="padding:7px 0;font-size:15px;font-weight:800;color:${colour};text-align:right">${v}</td></tr>`

const leadLine = (n: string, p: string, extra: string, colour: string) =>
  `<tr><td style="padding:7px 0;border-bottom:1px solid #f2f3f6">
     <span style="font-weight:700;font-size:13.5px">${n}</span>
     <span style="color:#676879;font-size:12.5px"> · ${p}</span></td>
   <td style="padding:7px 0;border-bottom:1px solid #f2f3f6;text-align:right;font-size:12px;font-weight:700;color:${colour}">${extra}</td></tr>`

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') || ''
  const url = new URL(req.url)
  // Vercel Cron sends the secret; a manual run can pass ?secret= instead.
  const ok = secret && (auth === `Bearer ${secret}` || url.searchParams.get('secret') === secret)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const when = url.searchParams.get('when') === 'evening' ? 'evening' : 'morning'
  const supa = admin()
  const today = todayISO()
  const requeued: string[] = []

  // ── morning only: pull missed meetings back into the queue ────────────────
  if (when === 'morning') {
    const { data: booked } = await supa
      .from('leads').select('id,first_name,last_name,meeting_at')
      .eq('status', 'Meeting Booked')
    for (const l of booked ?? []) {
      const { data: open } = await supa
        .from('call_schedule').select('id')
        .eq('lead_id', l.id).is('completed_at', null).maybeSingle()
      if (open) continue

      if (l.meeting_at) {
        // We know the actual slot: it is missed only once it is in the past.
        if (Date.parse(l.meeting_at) > Date.now()) continue
      } else {
        // Older bookings have no slot recorded, so fall back to the age of the
        // booking itself and give it 2 days before assuming it was missed.
        const { data: att } = await supa
          .from('call_attempts').select('created_at')
          .eq('lead_id', l.id).eq('outcome', 'meeting_booked')
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (!att) continue
        if (Date.now() - Date.parse(att.created_at) < 2 * 86400000) continue
      }

      await requeue(l.id, 'missed_meeting')
      requeued.push(`${l.first_name} ${l.last_name}`)
    }
  }

  // ── gather ────────────────────────────────────────────────────────────────
  const { data: open } = await supa
    .from('call_schedule')
    .select('due_on, attempt_no, leads!inner(first_name,last_name,phone,status,parked_at)')
    .is('completed_at', null)

  const live = (open ?? []).filter(r => !(r.leads as unknown as { parked_at: string | null }).parked_at)
  const overdue = live.filter(r => r.due_on < today)
  const dueToday = live.filter(r => r.due_on === today)

  const { count: parkedCount } = await supa
    .from('leads').select('id', { count: 'exact', head: true }).not('parked_at', 'is', null)

  const since = today + 'T00:00:00Z'
  const { data: todaysCalls } = await supa
    .from('call_attempts').select('outcome, caller_name, lead_id').gte('created_at', since)

  const byOutcome = (todaysCalls ?? []).reduce<Record<string, number>>((a, c) => {
    a[c.outcome] = (a[c.outcome] ?? 0) + 1; return a
  }, {})

  const { data: adminsRows } = await supa
    .from('profiles').select('email').eq('role', 'admin').eq('active', true)
  const to = (adminsRows ?? []).map(a => a.email).filter(Boolean)
  if (!to.length) return NextResponse.json({ ok: true, sent: 0, note: 'no admins' })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.mypensionadvisor.co.uk'
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  let subject: string, body: string

  if (when === 'morning') {
    subject = `Today: ${dueToday.length} calls${overdue.length ? `, ${overdue.length} overdue` : ''}`
    body = `
      <h2 style="margin:0 0 3px;font-size:21px;letter-spacing:-.4px">Good morning</h2>
      <p style="margin:0 0 20px;color:#676879;font-size:13.5px">${dateLabel}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        ${row('Overdue', String(overdue.length), overdue.length ? '#e2445c' : '#323338')}
        ${row('Due today', String(dueToday.length), '#0073ea')}
        ${row('Parked, awaiting you', String(parkedCount ?? 0), (parkedCount ?? 0) ? '#b26b00' : '#323338')}
      </table>
      ${overdue.length ? `<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#e2445c;margin-bottom:6px">Overdue, ring first</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
        ${overdue.slice(0, 10).map(r => { const l = r.leads as unknown as { first_name: string; last_name: string; phone: string }
          return leadLine(`${l.first_name} ${l.last_name}`, l.phone, `due ${r.due_on}`, '#e2445c') }).join('')}
      </table>` : ''}
      ${dueToday.length ? `<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#0073ea;margin-bottom:6px">Due today</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
        ${dueToday.slice(0, 15).map(r => { const l = r.leads as unknown as { first_name: string; last_name: string; phone: string }
          return leadLine(`${l.first_name} ${l.last_name}`, l.phone, `attempt ${r.attempt_no}/4`, '#676879') }).join('')}
      </table>` : '<p style="font-size:13.5px;color:#676879">Nothing due today.</p>'}
      ${requeued.length ? `<div style="background:#fff8ed;border-left:3px solid #fdab3d;padding:11px 14px;font-size:13px;color:#8a5a00;margin-bottom:18px">
        <b>${requeued.length} missed meeting${requeued.length === 1 ? '' : 's'} returned to the queue:</b> ${requeued.join(', ')}</div>` : ''}`
  } else {
    const made = (todaysCalls ?? []).length
    const booked = byOutcome['meeting_booked'] ?? 0
    subject = `Tonight: ${made} calls made, ${booked} booked`
    body = `
      <h2 style="margin:0 0 3px;font-size:21px;letter-spacing:-.4px">Today's activity</h2>
      <p style="margin:0 0 20px;color:#676879;font-size:13.5px">${dateLabel}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        ${row('Calls made', String(made), '#0073ea')}
        ${row('Meetings booked', String(booked), booked ? '#00c875' : '#323338')}
        ${row('Still overdue', String(overdue.length), overdue.length ? '#e2445c' : '#323338')}
        ${row('Rolling to tomorrow', String(dueToday.length))}
      </table>
      ${made ? `<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#676879;margin-bottom:6px">Outcomes</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
        ${Object.entries(byOutcome).map(([o, n]) =>
          `<tr><td style="padding:6px 0;border-bottom:1px solid #f2f3f6;font-size:13.5px">${outcomeMeta(o)?.label ?? o}</td>
           <td style="padding:6px 0;border-bottom:1px solid #f2f3f6;text-align:right;font-weight:800;font-size:13.5px">${n}</td></tr>`).join('')}
      </table>` : '<p style="font-size:13.5px;color:#676879">No calls logged today.</p>'}`
  }

  const resend = new Resend(process.env.RESEND_API_KEY!)
  await resend.emails.send({
    from: 'PeaK Lead Hub <noreply@mypensionadvisor.co.uk>',
    to,
    subject,
    html: `<div style="font-family:system-ui,sans-serif;max-width:540px;margin:0 auto;padding:28px 26px;background:#fff;border:1px solid #e6e9ef;border-radius:12px;color:#323338">
      ${body}
      <a href="${appUrl}/crm" style="display:inline-block;background:#0073ea;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:8px;margin-top:6px">Open the CRM →</a>
      <p style="font-size:12px;color:#9699a6;margin:22px 0 0">PeaK Lead Hub · ${when} digest</p>
    </div>`,
  })

  return NextResponse.json({
    ok: true, when, sent: to.length,
    overdue: overdue.length, dueToday: dueToday.length,
    parked: parkedCount ?? 0, requeued: requeued.length,
  })
}
