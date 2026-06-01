'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, logAudit, logCallAttempt, CALL_OUTCOMES, type Profile, type CallAttempt } from '@/lib/supabase'

// Caller-safe view of a lead — only the fields a caller is allowed to see.
type CallerLead = {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string
  phone_valid: boolean
  status: string
  notes: string | null
  created_at: string
  date: string
}

const CALLER_FIELDS = 'id,first_name,last_name,email,phone,phone_valid,status,notes,created_at,date'

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || ''

const DONE_STATUSES = ['Meeting Booked', 'Cold', 'Invalid Phone']

function pillClass(status: string) {
  const m: Record<string, string> = {
    'New': 'pill p-new', 'Contacted': 'pill p-contacted', 'Qualified': 'pill p-qualified',
    'Meeting Booked': 'pill p-booked', 'Cold': 'pill p-cold', 'Invalid Phone': 'pill p-invalid',
  }
  return m[status] ?? 'pill p-new'
}

function outcomeLabel(value: string) {
  return CALL_OUTCOMES.find(o => o.value === value)?.label ?? value
}
function outcomeTone(value: string) {
  const t = CALL_OUTCOMES.find(o => o.value === value)?.tone ?? 'blue'
  return { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', blue: 'var(--accent)' }[t]
}

function relTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  currentUser: Profile
  onNotif: (msg: string, color?: string) => void
}

export default function CallerWorkspace({ currentUser, onNotif }: Props) {
  const [leads, setLeads] = useState<CallerLead[]>([])
  const [attempts, setAttempts] = useState<CallAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'active' | 'all'>('active')

  // per-lead working state
  const [noteDraft, setNoteDraft] = useState('')
  const [outcome, setOutcome] = useState('')
  const [attemptNote, setAttemptNote] = useState('')
  const [savingAttempt, setSavingAttempt] = useState(false)
  const [showCal, setShowCal] = useState(false)

  const fetchAll = useCallback(async () => {
    const [{ data: ld }, { data: at }] = await Promise.all([
      supabase.from('leads').select(CALLER_FIELDS).order('created_at', { ascending: false }),
      supabase.from('call_attempts').select('*').order('created_at', { ascending: false }),
    ])
    setLeads((ld as CallerLead[]) ?? [])
    setAttempts((at as CallAttempt[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const attemptsByLead = useMemo(() => {
    const m = new Map<number, CallAttempt[]>()
    for (const a of attempts) {
      const arr = m.get(a.lead_id) ?? []
      arr.push(a)
      m.set(a.lead_id, arr)
    }
    return m
  }, [attempts])

  const visible = useMemo(() => {
    return leads.filter(l => {
      if (view === 'active' && DONE_STATUSES.includes(l.status)) return false
      if (search) {
        const s = `${l.first_name} ${l.last_name} ${l.phone} ${l.email ?? ''}`.toLowerCase()
        if (!s.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [leads, view, search])

  const selected = leads.find(l => l.id === selId) ?? null
  const selAttempts = selId ? (attemptsByLead.get(selId) ?? []) : []

  // when selecting a lead, sync the note draft and reset the attempt form
  const selectLead = (id: number) => {
    setSelId(id)
    const l = leads.find(x => x.id === id)
    setNoteDraft(l?.notes ?? '')
    setOutcome('')
    setAttemptNote('')
    setShowCal(false)
  }

  const saveNote = async () => {
    if (!selected || noteDraft === (selected.notes ?? '')) return
    const { error } = await supabase.from('leads').update({ notes: noteDraft }).eq('id', selected.id)
    if (error) { onNotif('⚠ Could not save note', 'var(--red)'); return }
    setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, notes: noteDraft } : l))
    onNotif('✅ Note saved')
  }

  const saveAttempt = async () => {
    if (!selected || !outcome) { onNotif('⚠ Pick an outcome first', 'var(--amber)'); return }
    setSavingAttempt(true)
    const oc = CALL_OUTCOMES.find(o => o.value === outcome)!
    const { error } = await logCallAttempt({
      lead_id: selected.id,
      caller_id: currentUser.id,
      caller_name: currentUser.name,
      outcome: outcome,
      note: attemptNote.trim() || undefined,
    })
    if (error) { setSavingAttempt(false); onNotif('⚠ Could not log call: ' + error.message, 'var(--red)'); return }

    // advance lead status based on the outcome
    let newStatus = selected.status
    if (oc.status && oc.status !== selected.status) {
      const { error: sErr } = await supabase.from('leads').update({ status: oc.status }).eq('id', selected.id)
      if (!sErr) newStatus = oc.status
    }

    await logAudit({
      user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role,
      action: 'Call logged', entity_type: 'lead', entity_id: String(selected.id),
      details: { lead: `${selected.first_name} ${selected.last_name}`, outcome: oc.label },
    })

    setSavingAttempt(false)
    setOutcome('')
    setAttemptNote('')
    setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, status: newStatus } : l))
    await fetchAll()
    onNotif(`✅ Call logged — ${oc.label}`)
    if (oc.value === 'meeting_booked') onNotif('🎉 Meeting booked!', 'var(--green)')
  }

  const calSrc = useMemo(() => {
    if (!CALENDLY_URL || !selected) return ''
    const params = new URLSearchParams({
      hide_gdpr_banner: '1',
      name: `${selected.first_name} ${selected.last_name}`.trim(),
    })
    if (selected.email) params.set('email', selected.email)
    return `${CALENDLY_URL}?${params.toString()}`
  }, [selected])

  const telHref = selected ? `tel:${selected.phone.replace(/[^\d+]/g, '')}` : ''

  return (
    <div className={`cw${selId ? ' show-detail' : ''}`}>
      {/* ── Lead list ── */}
      <div className="cw-list">
        <div className="cw-list-head">
          <h2>📞 Leads to Call</h2>
          <p>{visible.length} {view === 'active' ? 'to work' : 'total'} · highest priority first</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button className={`btn btn-sm ${view === 'active' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('active')}>To call</button>
            <button className={`btn btn-sm ${view === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('all')}>All</button>
          </div>
          <input className="cw-search" placeholder="🔍 Search name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="cw-items">
          {loading ? <div className="empty">Loading…</div>
          : visible.length === 0 ? <div className="empty">No leads to call right now. 🎉</div>
          : visible.map(l => {
            const la = attemptsByLead.get(l.id) ?? []
            return (
              <div key={l.id} className={`cw-item${l.id === selId ? ' sel' : ''}`} onClick={() => selectLead(l.id)}>
                <div className="cw-item-top">
                  <span className="cw-item-name">{l.first_name} {l.last_name}</span>
                  <span className={pillClass(l.status)}>{l.status}</span>
                </div>
                <div className="cw-item-phone">📱 {l.phone}{!l.phone_valid && <span style={{ color: 'var(--red)', marginLeft: 6, fontSize: 11 }}>⚠ check</span>}</div>
                <div className="cw-item-meta">
                  {la.length > 0
                    ? <><span>{la.length} attempt{la.length !== 1 ? 's' : ''}</span><span>· last {relTime(la[0].created_at)}</span></>
                    : <span>Not called yet</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Lead detail ── */}
      <div className="cw-detail">
        {!selected ? (
          <div className="empty" style={{ margin: 'auto' }}>Select a lead from the list to start calling.</div>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm cw-back" onClick={() => setSelId(null)}>← Back to list</button>

            {/* Hero + contact */}
            <div>
              <div className="cw-hero">
                <div>
                  <h1>{selected.first_name} {selected.last_name}</h1>
                  <div style={{ marginTop: 8 }}><span className={pillClass(selected.status)}>{selected.status}</span></div>
                </div>
              </div>
              <div className="cw-contact">
                <a className="cw-contact-btn call" href={telHref}>
                  📞 Call <span style={{ fontVariantNumeric: 'tabular-nums' }}>{selected.phone}</span>
                </a>
                {selected.email && (
                  <a className="cw-contact-btn" href={`mailto:${selected.email}`}>
                    ✉️ <span>{selected.email}</span>
                  </a>
                )}
                {!selected.phone_valid && (
                  <span className="cw-contact-btn" style={{ color: 'var(--red)', borderColor: '#fecaca', cursor: 'default' }}>⚠ Number may be invalid</span>
                )}
              </div>
            </div>

            {/* Log a call */}
            <div className="cw-panel">
              <div className="cw-panel-head">Log this call</div>
              <div className="cw-panel-body">
                <div className="outcome-grid">
                  {CALL_OUTCOMES.map(o => (
                    <button
                      key={o.value}
                      className={`outcome-opt${outcome === o.value ? ' sel-' + o.tone : ''}`}
                      onClick={() => setOutcome(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  style={{ marginTop: 12 }}
                  placeholder="Add a note about this call (optional)…"
                  value={attemptNote}
                  onChange={e => setAttemptNote(e.target.value)}
                />
                <div style={{ marginTop: 12, display: 'flex', gap: 9, alignItems: 'center' }}>
                  <button className="btn btn-primary" onClick={saveAttempt} disabled={savingAttempt || !outcome}>
                    {savingAttempt ? 'Saving…' : '✓ Save call attempt'}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {outcome ? `Will mark lead "${CALL_OUTCOMES.find(o => o.value === outcome)?.status}"` : 'Pick an outcome'}
                  </span>
                </div>
              </div>
            </div>

            {/* Call history */}
            <div className="cw-panel">
              <div className="cw-panel-head">
                Call history
                <span className="attempt-count">{selAttempts.length} attempt{selAttempts.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="cw-panel-body">
                {selAttempts.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>No calls logged yet. Log your first attempt above.</div>
                ) : selAttempts.map(a => (
                  <div key={a.id} className="log-row">
                    <span className="log-dot" style={{ background: outcomeTone(a.outcome) }} />
                    <div className="log-body">
                      <div className="log-top">
                        <span className="log-outcome" style={{ color: outcomeTone(a.outcome) }}>{outcomeLabel(a.outcome)}</span>
                        <span className="log-time">{relTime(a.created_at)}</span>
                      </div>
                      {a.note && <div className="log-note">{a.note}</div>}
                      <div className="log-caller">by {a.caller_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="cw-panel">
              <div className="cw-panel-head">Lead notes</div>
              <div className="cw-panel-body">
                <textarea
                  rows={4}
                  placeholder="General notes about this lead — saved when you click away…"
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  onBlur={saveNote}
                />
              </div>
            </div>

            {/* Calendly */}
            <div className="cw-panel">
              <div className="cw-panel-head">
                📅 Book a meeting
                {CALENDLY_URL && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowCal(s => !s)}>
                    {showCal ? 'Hide calendar' : 'Open calendar'}
                  </button>
                )}
              </div>
              {!CALENDLY_URL ? (
                <div className="cw-panel-body" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  Calendly isn’t configured yet. Add your scheduling link as <code>NEXT_PUBLIC_CALENDLY_URL</code> to enable in-app booking.
                </div>
              ) : showCal ? (
                <iframe className="cal-embed" src={calSrc} title="Calendly booking" />
              ) : (
                <div className="cw-panel-body" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  Click “Open calendar” to book — it’ll be prefilled with {selected.first_name}’s name{selected.email ? ' and email' : ''}.
                  After booking, log the call above as “Meeting booked”.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
