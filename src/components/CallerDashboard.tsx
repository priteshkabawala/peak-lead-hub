'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, CALL_OUTCOMES, outcomeMeta, type Profile } from '@/lib/supabase'

// Caller dashboard: today's call queue, grouped, overdue first.
// Design: approved variant F (monday-style board + ops-table density).
// The caller never sees campaign, score or any financial field.

type Row = {
  schedule_id: number
  lead_id: number
  attempt_no: number
  due_on: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  status: string
  campaign: string | null
  last_outcome: string | null
}

const TODAY = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())

function daysLate(due: string, today: string) {
  const a = Date.parse(due + 'T00:00:00Z'), b = Date.parse(today + 'T00:00:00Z')
  return Math.round((b - a) / 86400000)
}

const STATUS_COLOUR: Record<string, string> = {
  'New': '#579bfc', 'Contacted': '#a25ddc', 'Qualified': '#00c875',
  'Meeting Booked': '#00c875', 'Cold': '#9699a6', 'Invalid Phone': '#e2445c',
}

interface Props { currentUser: Profile; onNotif: (m: string, c?: string) => void; onBook?: (leadId: number) => void }

export default function CallerDashboard({ currentUser, onNotif, onBook }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'today' | 'overdue' | 'all'>('today')
  const [openLead, setOpenLead] = useState<Row | null>(null)
  const [outcome, setOutcome] = useState('')
  const [note, setNote] = useState('')
  const [cbDate, setCbDate] = useState('')
  const [saving, setSaving] = useState(false)
  const isAdmin = currentUser.role === 'admin'
  const today = TODAY()

  const load = useCallback(async () => {
    // Open callbacks joined to their lead. Parked leads have no open row, so
    // they cannot appear here.
    const { data: sched } = await supabase
      .from('call_schedule')
      .select('id, lead_id, attempt_no, due_on, leads!inner(first_name,last_name,phone,email,status,campaign,parked_at)')
      .is('completed_at', null)
      .order('due_on', { ascending: true })

    const ids = (sched ?? []).map(s => s.lead_id)
    const lastByLead = new Map<number, string>()
    if (ids.length) {
      const { data: atts } = await supabase
        .from('call_attempts').select('lead_id,outcome,created_at')
        .in('lead_id', ids).order('created_at', { ascending: false })
      for (const a of atts ?? []) if (!lastByLead.has(a.lead_id)) lastByLead.set(a.lead_id, a.outcome)
    }

    const mapped: Row[] = (sched ?? [])
      .map(s => {
        const l = s.leads as unknown as Row & { parked_at: string | null }
        if (l.parked_at) return null
        return {
          schedule_id: s.id, lead_id: s.lead_id, attempt_no: s.attempt_no, due_on: s.due_on,
          first_name: l.first_name, last_name: l.last_name, phone: l.phone, email: l.email,
          status: l.status, campaign: l.campaign,
          last_outcome: lastByLead.get(s.lead_id) ?? null,
        }
      })
      .filter(Boolean) as Row[]

    setRows(mapped)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const groups = useMemo(() => {
    const overdue = rows.filter(r => r.due_on < today)
    const dueToday = rows.filter(r => r.due_on === today)
    const upcoming = rows.filter(r => r.due_on > today)
    return { overdue, dueToday, upcoming }
  }, [rows, today])

  const visible = filter === 'overdue' ? { overdue: groups.overdue, dueToday: [], upcoming: [] }
    : filter === 'all' ? groups
    : { overdue: groups.overdue, dueToday: groups.dueToday, upcoming: [] }

  const meta = outcome ? outcomeMeta(outcome) : undefined

  const save = async () => {
    if (!openLead || !outcome || !meta) return
    // Booking needs the actual slot, so hand off to the booking screen rather
    // than closing the lead here with no meeting time recorded.
    if (outcome === 'meeting_booked' && onBook) {
      const id = openLead.lead_id
      setOpenLead(null); setOutcome(''); setNote(''); setCbDate('')
      onBook(id)
      return
    }
    if (meta.confirm && !confirm(`"${meta.label}" closes this lead and stops all further callbacks.\n\nAre you sure?`)) return
    if (meta.askDate && !cbDate) { onNotif('⚠ Pick a callback date', 'var(--amber)'); return }

    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/calls/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ leadId: openLead.lead_id, outcome, note, callbackDate: cbDate || null }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { onNotif('⚠ ' + (json.error ?? 'Could not save'), 'var(--red)'); return }

    onNotif(json.nextDue
      ? `✅ Logged. Next call ${new Date(json.nextDue + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
      : json.exhausted ? '✅ Logged. 4 attempts done, sent to admin' : `✅ Logged. Lead is now ${json.status}`)
    setOpenLead(null); setOutcome(''); setNote(''); setCbDate('')
    load()
  }

  const Group = ({ title, sub, colour, list, late }: { title: string; sub: string; colour: string; list: Row[]; late?: boolean }) => {
    if (!list.length) return null
    return (
      <div className="cd-grp" style={{ ['--c' as string]: colour }}>
        <div className="cd-ghead"><span className="cd-gdot" /><span className="cd-gname">{title}</span>
          <span className="cd-gcount">{list.length} {list.length === 1 ? 'lead' : 'leads'} · {sub}</span></div>
        <div className="cd-tw"><table>
          <thead><tr>
            <th style={{ width: 44 }} /><th>Lead</th><th>Phone</th>
            {isAdmin && <th>Campaign</th>}
            <th>Status</th><th>Attempts</th><th className="cd-hm">Last outcome</th><th>Due</th><th style={{ width: 132 }} />
          </tr></thead>
          <tbody>
            {list.map(r => {
              const n = late ? daysLate(r.due_on, today) : 0
              return (
                <tr key={r.schedule_id} className={late ? 'cd-u' : ''} style={{ ['--c' as string]: colour }}>
                  <td className="c-pri"><span className="cd-pri" style={{ background: late ? '#e2445c' : '#0073ea' }}>{late ? 'P1' : 'P2'}</span></td>
                  <td className="c-nm cd-nm">{r.first_name} {r.last_name}</td>
                  <td className="c-tel cd-tel">{r.phone}</td>
                  {isAdmin && <td className="c-camp">{r.campaign ?? '—'}</td>}
                  <td className="c-st"><span className="cd-pill" style={{ background: STATUS_COLOUR[r.status] ?? '#579bfc' }}>{r.status}</span></td>
                  <td className="c-att"><span className="cd-att">
                    {[0, 1, 2, 3].map(i => <u key={i} className={i < r.attempt_no - 1 ? 'f' : ''} />)}
                    <b>{r.attempt_no - 1}/4</b></span></td>
                  <td className="c-lo cd-lo cd-hm">{r.last_outcome ? (outcomeMeta(r.last_outcome)?.label ?? r.last_outcome) : '—'}</td>
                  <td className={'c-due cd-due' + (late ? ' r' : '')}>{late ? `−${n} day${n === 1 ? '' : 's'}` : r.due_on === today ? 'Today' : new Date(r.due_on + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="c-act"><div className="cd-acts">
                    <a className="cd-btn" href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>Call</a>
                    <button className="cd-btn o" onClick={() => { setOpenLead(r); setOutcome(''); setNote(''); setCbDate('') }}>Log</button>
                    {onBook && <button className="cd-btn o" onClick={() => onBook(r.lead_id)}>Book</button>}
                  </div></td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      </div>
    )
  }

  return (
    <div className="cd">
      <div className="cd-filters">
        {(['today', 'overdue', 'all'] as const).map(f => (
          <button key={f} className={`cd-f${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'today' ? 'Due today' : f === 'overdue' ? 'Overdue' : 'All open'}
          </button>
        ))}
        <span className="cd-cnt">{rows.length} open</span>
      </div>

      <div className="cd-scroll">
        <div className="cd-stats">
          <div className="cd-stat" style={{ ['--c' as string]: '#e2445c' }}><b>{groups.overdue.length}</b><span>Overdue</span></div>
          <div className="cd-stat" style={{ ['--c' as string]: '#0073ea' }}><b>{groups.dueToday.length}</b><span>Due today</span></div>
          <div className="cd-stat" style={{ ['--c' as string]: '#a25ddc' }}><b>{rows.filter(r => r.status === 'Contacted').length}</b><span>In progress</span></div>
          <div className="cd-stat" style={{ ['--c' as string]: '#00c875' }}><b>{rows.filter(r => r.attempt_no === 1).length}</b><span>Not yet called</span></div>
        </div>

        {loading ? <div className="empty">Loading…</div>
          : rows.length === 0 ? <div className="empty">Nothing due. 🎉</div>
          : <>
            <Group title="Overdue" sub="ring these first" colour="#e2445c" list={visible.overdue} late />
            <Group title="Due today" sub="today's calls" colour="#0073ea" list={visible.dueToday} />
            <Group title="Upcoming" sub="scheduled ahead" colour="#9699a6" list={visible.upcoming} />
          </>}
      </div>

      {openLead && (
        <div className="cd-modalbg" onClick={() => setOpenLead(null)}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
            <div className="cd-mh">
              <div><div className="cd-mn">{openLead.first_name} {openLead.last_name}</div>
                <a className="cd-mt" href={`tel:${openLead.phone.replace(/[^\d+]/g, '')}`}>{openLead.phone}</a></div>
              <span className="cd-att" style={{ marginLeft: 'auto' }}>
                {[0, 1, 2, 3].map(i => <u key={i} className={i < openLead.attempt_no - 1 ? 'f' : ''} />)}
                <b>attempt {openLead.attempt_no} of 4</b></span>
            </div>
            <div className="cd-mb">
              <div className="cd-og">
                {CALL_OUTCOMES.map(o => (
                  <button key={o.value} className={`cd-o${outcome === o.value ? ' sel' : ''}`} onClick={() => setOutcome(o.value)}>
                    <i style={{ background: o.tone === 'green' ? '#00c875' : o.tone === 'red' ? '#e2445c' : '#fdab3d' }} />
                    {o.label}
                    <em>{o.value === 'meeting_booked' ? 'pick a slot next'
                      : o.schedule === 'stop' ? 'closes lead'
                      : o.askDate ? 'pick a date' : 'next in 3 days'}</em>
                  </button>
                ))}
              </div>
              {meta?.askDate && (
                <div className="cd-dp">
                  <label>Call back on</label>
                  <input type="date" value={cbDate} min={today} onChange={e => setCbDate(e.target.value)} />
                  <span>weekends move to Monday</span>
                </div>
              )}
              <textarea rows={3} placeholder="Note about this call (optional)" value={note} onChange={e => setNote(e.target.value)} />
              <div className="cd-mact">
                <button className="cd-save" onClick={save} disabled={saving || !outcome}>{saving ? 'Saving…' : 'Save attempt'}</button>
                <button className="cd-btn o" onClick={() => setOpenLead(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
