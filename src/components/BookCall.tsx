'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, outcomeMeta, type Profile } from '@/lib/supabase'

// Book a meeting for one lead. Calendly is embedded prefilled so the caller
// only picks a time; she then confirms the slot here, which books the lead and
// takes it off the call schedule.
// Design: approved book-call mockup.

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || ''

type Lead = {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string
  campaign: string | null
  status: string
  created_at: string
  guide_sent_at: string | null
  phone_type: string | null
  comments: string | null
  meeting_at: string | null
}

type Attempt = { outcome: string; note: string | null; created_at: string; caller_name: string | null }

const STATUS_COLOUR: Record<string, string> = {
  'New': '#579bfc', 'Contacted': '#a25ddc', 'Qualified': '#00c875',
  'Meeting Booked': '#00c875', 'Cold': '#9699a6', 'Invalid Phone': '#e2445c',
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

interface Props {
  leadId: number
  currentUser: Profile
  onNotif: (m: string, c?: string) => void
  onBack: () => void
  onBooked?: () => void
}

export default function BookCall({ leadId, onNotif, onBack, onBooked }: Props) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [attemptNo, setAttemptNo] = useState(1)
  const [slot, setSlot] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [{ data: l }, { data: a }, { data: s }] = await Promise.all([
      supabase.from('leads')
        .select('id,first_name,last_name,email,phone,campaign,status,created_at,guide_sent_at,phone_type,comments,meeting_at')
        .eq('id', leadId).single(),
      supabase.from('call_attempts').select('outcome,note,created_at,caller_name')
        .eq('lead_id', leadId).order('created_at', { ascending: false }).limit(6),
      supabase.from('call_schedule').select('attempt_no')
        .eq('lead_id', leadId).is('completed_at', null).maybeSingle(),
    ])
    setLead(l as Lead | null)
    setAttempts((a ?? []) as Attempt[])
    setAttemptNo(s?.attempt_no ?? 1)
    if (l?.meeting_at) setSlot(new Date(l.meeting_at).toISOString().slice(0, 16))
    setLoading(false)
  }, [leadId])

  useEffect(() => { load() }, [load])

  const calSrc = useMemo(() => {
    if (!CALENDLY_URL || !lead) return ''
    const p = new URLSearchParams({ hide_gdpr_banner: '1', name: `${lead.first_name} ${lead.last_name}`.trim() })
    if (lead.email) p.set('email', lead.email)
    return `${CALENDLY_URL}?${p.toString()}`
  }, [lead])

  const confirm_ = async () => {
    if (!lead || !slot) return
    const when = new Date(slot)
    if (Number.isNaN(when.getTime())) { onNotif('⚠ That slot is not a valid date', 'var(--amber)'); return }
    if (when.getTime() < Date.now()) { onNotif('⚠ That slot is in the past', 'var(--amber)'); return }

    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/calls/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({
        leadId, outcome: 'meeting_booked',
        note: `Meeting booked for ${when.toLocaleString('en-GB')}`,
        meetingAt: when.toISOString(),
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { onNotif('⚠ ' + (json.error ?? 'Could not confirm'), 'var(--red)'); return }
    onNotif('🎉 Meeting booked — lead is off the call schedule', 'var(--green)')
    onBooked?.()
    onBack()
  }

  if (loading) return <div className="empty">Loading…</div>
  if (!lead) return <div className="empty">Lead not found.</div>

  const prettySlot = slot && !Number.isNaN(Date.parse(slot)) ? new Date(slot) : null

  return (
    <div className="bc">
      <div className="bc-top">
        <button className="bc-back" onClick={onBack}>← Lead</button>
        <h1>{lead.first_name} {lead.last_name}</h1>
        <span className="cd-pill" style={{ background: STATUS_COLOUR[lead.status] ?? '#579bfc' }}>{lead.status}</span>
        <div className="bc-steps">
          <b className="on">1</b>Pick a slot<b className={slot ? 'on' : ''}>2</b>Confirm
        </div>
      </div>

      <div className="bc-wrap">
        <div>
          <div className="bc-card">
            <div className="bc-ch">📅 Book a meeting
              {CALENDLY_URL && <span className="n">{CALENDLY_URL.replace(/^https?:\/\//, '')}</span>}
            </div>
            <div className="bc-cb">
              {CALENDLY_URL ? (
                <>
                  <div className="bc-prefill">✓ <div>
                    <b>Prefilled for this lead.</b> {lead.first_name}&rsquo;s name{lead.email ? ' and email are' : ' is'} passed
                    to Calendly, so they only pick a time.
                  </div></div>
                  <iframe className="bc-cal" src={calSrc} title="Calendly booking" />
                </>
              ) : (
                <div className="bc-nocal">
                  Calendly isn&rsquo;t configured. Add your scheduling link as <code>NEXT_PUBLIC_CALENDLY_URL</code>
                  {' '}to embed booking here. You can still confirm a slot below.
                </div>
              )}

              <div className="bc-conf">
                <div className="t">Confirm the slot that was booked</div>
                <div className="bc-slot">
                  <div className="bc-dt">
                    <b>{prettySlot ? prettySlot.getDate() : '–'}</b>
                    <span>{prettySlot ? prettySlot.toLocaleDateString('en-GB', { month: 'short' }) : '—'}</span>
                  </div>
                  <div className="bc-si">
                    <input type="datetime-local" value={slot} onChange={e => setSlot(e.target.value)} />
                    <span>{prettySlot
                      ? prettySlot.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                      : 'Pick the time the lead chose in Calendly'}</span>
                  </div>
                </div>
              </div>

              <div className="bc-warn">
                <b>What happens next.</b> Confirming sets this lead to <b>Meeting booked</b> and removes it from the call
                schedule. If the meeting time passes and the lead is still marked as booked, it returns to the caller&rsquo;s
                queue at the next morning digest.
              </div>

              <div className="bc-acts">
                <button className="bc-b g" onClick={confirm_} disabled={saving || !slot}>
                  {saving ? 'Booking…' : 'Confirm booking'}
                </button>
                <button className="bc-b o" onClick={onBack}>Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bc-card"><div className="bc-cb">
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.3px' }}>{lead.first_name} {lead.last_name}</div>
            <div style={{ fontSize: 13, color: '#676879', marginTop: 2 }}>{lead.email ?? 'no email'}</div>
            <a className="bc-tel" href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}>{lead.phone}</a>
            <span className="cd-att" style={{ marginTop: 9 }}>
              {[0, 1, 2, 3].map(i => <u key={i} className={i < attemptNo - 1 ? 'f' : ''} />)}
              <b>Attempt {attemptNo} of 4</b>
            </span>
          </div></div>

          <div className="bc-card">
            <div className="bc-ch">Recent activity</div>
            <div className="bc-cb" style={{ paddingTop: 6 }}>
              {attempts.map((a, i) => (
                <div key={i} className="bc-hist">
                  <b>{outcomeMeta(a.outcome)?.label ?? a.outcome}</b> · {stamp(a.created_at)}
                  {a.note && <div style={{ marginTop: 2 }}>{a.note}</div>}
                </div>
              ))}
              <div className="bc-hist" style={{ border: 'none' }}><b>Lead received</b> · {stamp(lead.created_at)}</div>
            </div>
          </div>

          {lead.comments && (
            <div className="bc-card">
              <div className="bc-ch">Comments</div>
              <div className="bc-cb" style={{ fontSize: 13, color: '#4b4e5c', lineHeight: 1.55 }}>{lead.comments}</div>
            </div>
          )}

          <div className="bc-card">
            <div className="bc-ch">Detail</div>
            <div className="bc-cb">
              <div className="bc-kv"><span>Guide sent</span>
                <b style={{ color: lead.guide_sent_at ? '#00c875' : '#9699a6' }}>
                  {lead.guide_sent_at ? `✓ ${new Date(lead.guide_sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'not yet'}
                </b></div>
              <div className="bc-kv"><span>Phone check</span>
                <b style={{ color: lead.phone_type === 'MOBILE' ? '#00c875' : '#9699a6' }}>
                  {lead.phone_type === 'MOBILE' ? '✓ UK mobile' : lead.phone_type ?? 'unchecked'}
                </b></div>
              <div className="bc-kv"><span>Campaign</span><b>{lead.campaign ?? '—'}</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
