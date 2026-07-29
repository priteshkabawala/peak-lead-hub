'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, type Profile } from '@/lib/supabase'

// Month calendar of the callback schedule, plus booked meetings.
// Design: approved calendar mockup. Clicking a day fills the side panel.

type Item = {
  lead_id: number
  first_name: string
  last_name: string
  phone: string
  attempt_no: number
  due_on: string
  kind: 'call'
} | {
  lead_id: number
  first_name: string
  last_name: string
  phone: string
  attempt_no: number
  due_on: string
  at: string
  kind: 'meeting'
}

const TZ = 'Europe/London'
const iso = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

// Grid maths runs in UTC so a BST day never rolls backwards.
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d))
const fmt = (d: Date) => d.toISOString().slice(0, 10)

interface Props { currentUser: Profile; onNotif: (m: string, c?: string) => void; onOpenLead: (id: number) => void }

export default function CalendarView({ onOpenLead }: Props) {
  const today = iso(new Date())
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(() => { const [y, m] = today.split('-').map(Number); return { y, m: m - 1 } })
  const [selected, setSelected] = useState(today)

  const load = useCallback(async () => {
    const [{ data: sched }, { data: meetings }] = await Promise.all([
      supabase.from('call_schedule')
        .select('lead_id,due_on,attempt_no,leads!inner(first_name,last_name,phone,parked_at)')
        .is('completed_at', null),
      supabase.from('leads')
        .select('id,first_name,last_name,phone,meeting_at')
        .not('meeting_at', 'is', null),
    ])

    const calls: Item[] = (sched ?? []).flatMap(s => {
      const l = s.leads as unknown as { first_name: string; last_name: string; phone: string; parked_at: string | null }
      if (l.parked_at) return []
      return [{
        kind: 'call' as const, lead_id: s.lead_id, due_on: s.due_on, attempt_no: s.attempt_no,
        first_name: l.first_name, last_name: l.last_name, phone: l.phone,
      }]
    })

    const meets: Item[] = (meetings ?? []).map(m => ({
      kind: 'meeting' as const, lead_id: m.id, at: m.meeting_at,
      due_on: iso(new Date(m.meeting_at)), attempt_no: 0,
      first_name: m.first_name, last_name: m.last_name, phone: m.phone,
    }))

    setItems([...calls, ...meets])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>()
    for (const i of items) {
      const k = i.due_on
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(i)
    }
    return m
  }, [items])

  // Six-week grid starting on the Monday on or before the 1st.
  const cells = useMemo(() => {
    const first = utc(cursor.y, cursor.m, 1)
    const lead = (first.getUTCDay() + 6) % 7 // Mon = 0
    const start = utc(cursor.y, cursor.m, 1 - lead)
    return Array.from({ length: 42 }, (_, n) => {
      const d = new Date(start); d.setUTCDate(d.getUTCDate() + n)
      const key = fmt(d)
      const dow = d.getUTCDay()
      return {
        key, day: d.getUTCDate(),
        inMonth: d.getUTCMonth() === cursor.m,
        weekend: dow === 0 || dow === 6,
        items: byDay.get(key) ?? [],
      }
    })
  }, [cursor, byDay])

  const monthLabel = new Date(Date.UTC(cursor.y, cursor.m, 1))
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  const step = (n: number) => setCursor(c => {
    const d = utc(c.y, c.m + n, 1)
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() }
  })

  const sel = byDay.get(selected) ?? []
  const selOverdue = sel.filter(i => i.kind === 'call' && i.due_on < today)
  const selCalls = sel.filter(i => i.kind === 'call' && i.due_on >= today)
  const selMeetings = sel.filter(i => i.kind === 'meeting')

  const monthItems = items.filter(i => {
    const [y, m] = i.due_on.split('-').map(Number)
    return y === cursor.y && m - 1 === cursor.m
  })
  const busiest = useMemo(() => {
    let best = { key: '', n: 0 }
    for (const c of cells) {
      const n = c.items.filter(i => i.kind === 'call').length
      if (c.inMonth && n > best.n) best = { key: c.key, n }
    }
    return best
  }, [cells])

  const Line = ({ i }: { i: Item }) => (
    <div className="cv-it" style={{ ['--c' as string]: i.kind === 'meeting' ? '#00c875' : i.due_on < today ? '#e2445c' : '#0073ea' }}
      onClick={() => onOpenLead(i.lead_id)}>
      <div>
        <div className="cv-nm">{i.first_name} {i.last_name}</div>
        <div className="cv-tl">{i.phone}</div>
      </div>
      <span className="cv-at">
        {i.kind === 'meeting'
          ? new Date(i.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
          : `${i.attempt_no - 1}/4`}
      </span>
    </div>
  )

  return (
    <div className="cv">
      <div className="cv-top">
        <div className="cv-mv">
          <b onClick={() => step(-1)}>‹</b>
          <span>{monthLabel}</span>
          <b onClick={() => step(1)}>›</b>
          <button className="cd-btn o" style={{ marginLeft: 8 }}
            onClick={() => { const [y, m] = today.split('-').map(Number); setCursor({ y, m: m - 1 }); setSelected(today) }}>
            Today
          </button>
        </div>
        <div className="cv-leg">
          <span><i style={{ background: '#0073ea' }} />Callback due</span>
          <span><i style={{ background: '#e2445c' }} />Overdue</span>
          <span><i style={{ background: '#00c875' }} />Meeting</span>
        </div>
      </div>

      <div className="cv-body">
        <div className="cv-calwrap">
          <div className="cv-dow">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <b key={d}>{d}</b>)}</div>
          <div className="cv-grid">
            {cells.map(c => {
              const calls = c.items.filter(i => i.kind === 'call')
              const overdue = calls.filter(i => i.due_on < today).length
              const due = calls.length - overdue
              const meets = c.items.filter(i => i.kind === 'meeting')
              const cls = ['cv-d']
              if (!c.inMonth) cls.push('off')
              if (c.weekend) cls.push('we')
              if (c.key === today) cls.push('today')
              if (c.key === selected) cls.push('sel')
              return (
                <div key={c.key} className={cls.join(' ')} onClick={() => setSelected(c.key)}>
                  <div className="cv-dn">{c.day}{c.key === today && <em>TODAY</em>}</div>
                  {overdue > 0 && <div className="cv-e o">{overdue} overdue</div>}
                  {due > 0 && <div className="cv-e c">{due} callback{due === 1 ? '' : 's'}</div>}
                  {meets.slice(0, 2).map(m => (
                    <div key={m.lead_id} className="cv-e m">
                      {m.first_name} {new Date((m as Extract<Item, { kind: 'meeting' }>).at)
                        .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })}
                    </div>
                  ))}
                  {meets.length > 2 && <div className="cv-more">+{meets.length - 2} more</div>}
                </div>
              )
            })}
          </div>
        </div>

        <div className="cv-side">
          <div className="cv-sh">
            {new Date(selected + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
          </div>
          <div className="cv-ss">
            {sel.filter(i => i.kind === 'call').length} call{sel.filter(i => i.kind === 'call').length === 1 ? '' : 's'} · {selMeetings.length} meeting{selMeetings.length === 1 ? '' : 's'}
          </div>

          {loading ? <div className="empty">Loading…</div> : (
            <>
              {selOverdue.length > 0 && <>
                <div className="cv-sec">Overdue · ring first</div>
                {selOverdue.map(i => <Line key={'o' + i.lead_id} i={i} />)}
              </>}
              {selMeetings.length > 0 && <>
                <div className="cv-sec">Meetings</div>
                {selMeetings.map(i => <Line key={'m' + i.lead_id} i={i} />)}
              </>}
              {selCalls.length > 0 && <>
                <div className="cv-sec">{selected === today ? 'Due today' : 'Callbacks'}</div>
                {selCalls.map(i => <Line key={'c' + i.lead_id} i={i} />)}
              </>}
              {sel.length === 0 && <div className="empty" style={{ padding: '24px 0' }}>Nothing scheduled.</div>}
            </>
          )}

          <div className="cv-tot">
            <div className="cv-tr"><span>Callbacks this month</span><b>{monthItems.filter(i => i.kind === 'call').length}</b></div>
            <div className="cv-tr"><span>Meetings booked</span><b>{monthItems.filter(i => i.kind === 'meeting').length}</b></div>
            <div className="cv-tr"><span>Busiest day</span>
              <b>{busiest.n ? `${new Date(busiest.key + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })} · ${busiest.n}` : '—'}</b></div>
          </div>
        </div>
      </div>
    </div>
  )
}
