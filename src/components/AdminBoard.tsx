'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, outcomeMeta, type Profile } from '@/lib/supabase'

// Admin board: every lead, grouped by what the admin has to do about it.
// Design: approved admin-board mockup. Admin-only — shows campaign and score,
// which callers must never see.

export type BoardRow = {
  lead_id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string
  campaign: string | null
  status: string
  score: number
  created_at: string
  parked_at: string | null
  parked_reason: string | null
  meeting_at: string | null
  due_on: string | null
  attempt_no: number
  last_outcome: string | null
}

const TODAY = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())

const daysLate = (due: string, today: string) =>
  Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(due + 'T00:00:00Z')) / 86400000)

const STATUS_COLOUR: Record<string, string> = {
  'New': '#579bfc', 'Contacted': '#a25ddc', 'Qualified': '#00c875',
  'Meeting Booked': '#00c875', 'Cold': '#9699a6', 'Invalid Phone': '#e2445c',
}

const scoreTone = (s: number) =>
  s >= 50 ? { background: '#f2fff9', color: '#00854f' }
  : s >= 20 ? { background: '#fff4e5', color: '#b26b00' }
  : { background: '#ffeef0', color: '#c0304a' }

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

type Filter = 'open' | 'today' | 'overdue' | 'booked' | 'cold' | 'parked'

interface Props {
  currentUser: Profile
  onNotif: (m: string, c?: string) => void
  onOpenLead: (leadId: number) => void
  onGoParked: () => void
}

export default function AdminBoard({ onNotif, onOpenLead, onGoParked }: Props) {
  const [rows, setRows] = useState<BoardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('open')
  const [campaign, setCampaign] = useState('')
  const [search, setSearch] = useState('')
  const today = TODAY()

  const load = useCallback(async () => {
    const { data: leads } = await supabase
      .from('leads')
      .select('id,first_name,last_name,email,phone,campaign,status,score,created_at,parked_at,parked_reason,meeting_at')
      .order('created_at', { ascending: false })

    const ids = (leads ?? []).map(l => l.id)

    const schedByLead = new Map<number, { due_on: string; attempt_no: number }>()
    const lastByLead = new Map<number, string>()
    if (ids.length) {
      const [{ data: sched }, { data: atts }] = await Promise.all([
        supabase.from('call_schedule').select('lead_id,due_on,attempt_no').is('completed_at', null).in('lead_id', ids),
        supabase.from('call_attempts').select('lead_id,outcome,created_at').in('lead_id', ids)
          .order('created_at', { ascending: false }),
      ])
      for (const s of sched ?? []) schedByLead.set(s.lead_id, { due_on: s.due_on, attempt_no: s.attempt_no })
      for (const a of atts ?? []) if (!lastByLead.has(a.lead_id)) lastByLead.set(a.lead_id, a.outcome)
    }

    setRows((leads ?? []).map(l => {
      const s = schedByLead.get(l.id)
      return {
        lead_id: l.id, first_name: l.first_name, last_name: l.last_name, email: l.email,
        phone: l.phone, campaign: l.campaign, status: l.status, score: l.score ?? 0,
        created_at: l.created_at, parked_at: l.parked_at, parked_reason: l.parked_reason,
        meeting_at: l.meeting_at,
        due_on: s?.due_on ?? null, attempt_no: s?.attempt_no ?? 1,
        last_outcome: lastByLead.get(l.id) ?? null,
      }
    }))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const campaigns = useMemo(
    () => Array.from(new Set(rows.map(r => r.campaign).filter(Boolean))).sort() as string[],
    [rows])

  // Text/campaign narrowing applies to every group; the filter chips pick groups.
  const pool = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r =>
      (!campaign || r.campaign === campaign) &&
      (!q || `${r.first_name} ${r.last_name} ${r.email ?? ''} ${r.phone}`.toLowerCase().includes(q)))
  }, [rows, campaign, search])

  const g = useMemo(() => {
    const live = pool.filter(r => !r.parked_at)
    return {
      overdue: live.filter(r => r.due_on && r.due_on < today),
      dueToday: live.filter(r => r.due_on === today),
      upcoming: live.filter(r => r.due_on && r.due_on > today),
      parked: pool.filter(r => r.parked_at),
      booked: live.filter(r => r.status === 'Meeting Booked'),
      cold: live.filter(r => r.status === 'Cold'),
    }
  }, [pool, today])

  const inProgress = pool.filter(r => r.status === 'Contacted' && !r.parked_at).length

  const show = (k: Filter) => filter === 'open' || filter === k

  const Group = ({
    title, sub, colour, list, kind,
  }: { title: string; sub: string; colour: string; list: BoardRow[]; kind: 'call' | 'parked' | 'booked' | 'cold' }) => {
    if (!list.length) return null
    return (
      <div className="cd-grp" style={{ ['--c' as string]: colour }}>
        <div className="cd-ghead">
          <span className="cd-gdot" /><span className="cd-gname">{title}</span>
          <span className="cd-gcount">{list.length} {list.length === 1 ? 'lead' : 'leads'} · {sub}</span>
        </div>
        <div className="cd-tw"><table className="ab">
          <thead><tr>
            <th>Lead</th><th>Phone</th><th>Campaign</th>
            <th>{kind === 'parked' ? 'Why parked' : 'Status'}</th>
            <th>Attempts</th>
            <th className="cd-hm">{kind === 'booked' ? 'Booked' : kind === 'cold' ? 'Reason' : 'Last outcome'}</th>
            <th>{kind === 'parked' ? 'Parked' : kind === 'booked' ? 'Meeting' : kind === 'cold' ? 'Closed' : 'Due'}</th>
            <th>Score</th><th style={{ width: 118 }} />
          </tr></thead>
          <tbody>
            {list.map(r => {
              const late = kind === 'call' && !!r.due_on && r.due_on < today
              const n = late && r.due_on ? daysLate(r.due_on, today) : 0
              return (
                <tr key={r.lead_id} className={late ? 'cd-u' : ''} style={{ ['--c' as string]: colour }}
                  onClick={() => onOpenLead(r.lead_id)}>
                  <td className="c-nm">
                    <div className="cd-nm">{r.first_name} {r.last_name}</div>
                    <div className="ab-sub">{r.email ?? 'no email'}</div>
                  </td>
                  <td className={'c-tel cd-tel' + (kind === 'parked' ? ' ab-bad' : '')}>{r.phone || '—'}</td>
                  <td className="c-camp"><span className="ab-ctag">{r.campaign ?? '—'}</span></td>
                  <td className="c-st">
                    <span className="cd-pill" style={{ background: kind === 'parked' ? '#e2445c' : STATUS_COLOUR[r.status] ?? '#579bfc' }}>
                      {kind === 'parked' ? (r.parked_reason ?? 'Unknown') : r.status}
                    </span>
                  </td>
                  <td className="c-att"><span className="cd-att">
                    {[0, 1, 2, 3].map(i => <u key={i} className={i < r.attempt_no - 1 ? 'f' : ''} />)}
                    <b>{r.attempt_no - 1}/4</b></span></td>
                  <td className="c-lo ab-sub cd-hm">
                    {kind === 'booked' ? 'Calendly'
                      : kind === 'cold' ? (r.last_outcome ? outcomeMeta(r.last_outcome)?.label ?? r.last_outcome : '4 attempts, no answer')
                      : r.last_outcome ? outcomeMeta(r.last_outcome)?.label ?? r.last_outcome : '—'}
                  </td>
                  <td className={'c-due cd-due' + (late ? ' r' : '')}>
                    {kind === 'parked' ? (r.parked_at ? shortDate(r.parked_at) : '—')
                      : kind === 'booked' ? (r.meeting_at
                          ? new Date(r.meeting_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : 'not set')
                      : kind === 'cold' ? shortDate(r.created_at)
                      : late ? `−${n} day${n === 1 ? '' : 's'}`
                      : r.due_on === today ? 'Today'
                      : r.due_on ? shortDate(r.due_on + 'T00:00:00') : '—'}
                  </td>
                  <td><span className="ab-sc" style={scoreTone(r.score)}>{r.score}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    {kind === 'parked'
                      ? <button className="cd-btn w" onClick={onGoParked}>Fix number</button>
                      : kind === 'cold'
                      ? <button className="cd-btn w" onClick={() => finalTry(r)}>Final try</button>
                      : <button className="cd-btn o" onClick={() => onOpenLead(r.lead_id)}>Open</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      </div>
    )
  }

  // "Final try" is the admin's own last attempt on a paid-for lead before it
  // is truly closed. It opens a prefilled email; it does not reschedule the
  // caller, and it is never offered for a do-not-call lead.
  const finalTry = (r: BoardRow) => {
    if (r.last_outcome === 'do_not_call') {
      onNotif('⚠ This lead asked not to be contacted. No further contact.', 'var(--red)')
      return
    }
    if (!r.email) { onNotif('⚠ No email on file for this lead', 'var(--amber)'); return }
    const subject = 'Your pension guide — one last note from My Pension Advisor'
    const body = `Hi ${r.first_name},\n\nYou requested a guide from My Pension Advisor and we have not managed to reach you by phone.\n\nIf a review would still be useful, you can book a time directly here:\n${process.env.NEXT_PUBLIC_CALENDLY_URL ?? ''}\n\nIf not, no problem at all and we will not contact you again.\n\nBest regards,\nPritesh Kabawala\nMy Pension Advisor`
    window.location.href = `mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const pipeline = pool.filter(r => !r.parked_at && r.status !== 'Cold').length

  return (
    <div className="cd">
      <div className="cd-filters">
        {(['open', 'today', 'overdue', 'booked', 'cold', 'parked'] as Filter[]).map(f => (
          <button key={f} className={`cd-f${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
            {{ open: 'All open', today: 'Due today', overdue: 'Overdue', booked: 'Booked', cold: 'Cold', parked: 'Parked' }[f]}
          </button>
        ))}
        <span style={{ width: 8 }} />
        <select className="cd-f" value={campaign} onChange={e => setCampaign(e.target.value)}>
          <option value="">All campaigns</option>
          {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="cd-f ab-search" placeholder="Search name, email, phone"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span className="cd-cnt">Showing {pool.length} of {rows.length}</span>
      </div>

      <div className="cd-scroll">
        <div className="cd-stats">
          <div className="cd-stat" style={{ ['--c' as string]: '#e2445c' }}><b>{g.overdue.length}</b><span>Overdue</span></div>
          <div className="cd-stat" style={{ ['--c' as string]: '#0073ea' }}><b>{g.dueToday.length}</b><span>Due today</span></div>
          <div className="cd-stat" style={{ ['--c' as string]: '#a25ddc' }}><b>{inProgress}</b><span>In progress</span></div>
          <div className="cd-stat" style={{ ['--c' as string]: '#00c875' }}><b>{g.booked.length}</b><span>Booked</span></div>
          <div className="cd-stat" style={{ ['--c' as string]: '#fdab3d' }}><b>{g.parked.length}</b><span>Parked</span></div>
          <div className="cd-stat" style={{ ['--c' as string]: '#9699a6' }}><b>{g.cold.length}</b><span>Cold</span></div>
          <div className="cd-stat" style={{ ['--c' as string]: '#5a5ce0' }}><b>{pipeline}</b><span>Live pipeline</span></div>
        </div>

        {loading ? <div className="empty">Loading…</div>
          : pool.length === 0 ? <div className="empty">No leads match those filters.</div>
          : <>
            {show('overdue') && <Group title="Overdue" sub="caller is behind" colour="#e2445c" list={g.overdue} kind="call" />}
            {show('today') && <Group title="Due today" sub="on the caller's list now" colour="#0073ea" list={g.dueToday} kind="call" />}
            {filter === 'open' && <Group title="Upcoming" sub="scheduled ahead" colour="#579bfc" list={g.upcoming} kind="call" />}
            {show('parked') && <Group title="Parked" sub="hidden from caller, awaiting your decision" colour="#fdab3d" list={g.parked} kind="parked" />}
            {show('booked') && <Group title="Meeting booked" sub="off the call schedule" colour="#00c875" list={g.booked} kind="booked" />}
            {show('cold') && <Group title="Cold" sub="your final follow-up pending" colour="#9699a6" list={g.cold} kind="cold" />}
          </>}
      </div>
    </div>
  )
}
