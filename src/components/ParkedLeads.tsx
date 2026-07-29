'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, type Profile } from '@/lib/supabase'

// Parked leads: numbers we do not trust, hidden from the caller until the
// admin fixes or clears them. Design: approved variant A (triage table).

type Parked = {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string
  campaign: string | null
  parked_at: string
  parked_reason: string | null
  score: number
}

const REASON_TONE = (r: string | null) => {
  const t = (r ?? '').toLowerCase()
  if (t.includes('landline')) return { bg: '#fff4e5', fg: '#b26b00' }
  if (t.includes('caller')) return { bg: '#eef2ff', fg: '#4b4ec0' }
  return { bg: '#ffeef0', fg: '#c0304a' }
}

interface Props { currentUser: Profile; onNotif: (m: string, c?: string) => void }

export default function ParkedLeads({ onNotif }: Props) {
  const [rows, setRows] = useState<Parked[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('id,first_name,last_name,email,phone,campaign,parked_at,parked_reason,score')
      .not('parked_at', 'is', null)
      .order('parked_at', { ascending: true })
    setRows((data ?? []) as Parked[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (leadId: number, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(leadId)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/leads/park', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ leadId, action, ...extra }),
    })
    const json = await res.json()
    setBusy(null)

    if (action === 'update_phone') {
      if (!json.ok) {
        onNotif('⚠ ' + (json.verdict?.reason ?? json.error ?? 'Number rejected'), 'var(--red)')
        return
      }
      onNotif(`✅ Number accepted. Back in the queue for ${json.dueOn}`)
    } else if (action === 'unpark') {
      onNotif(`✅ Returned to the caller's queue${json.dueOn ? ` for ${json.dueOn}` : ''}`)
    } else if (action === 'discard') {
      onNotif('✅ Lead discarded')
    }
    setDraft(d => { const n = { ...d }; delete n[leadId]; return n })
    load()
  }

  const byReason = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.parked_reason ?? 'Unknown'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  return (
    <div style={{ padding: '20px 22px 60px' }}>
      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px' }}>Parked leads</div>
        <span className="chip-amber">{rows.length} need a decision</span>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
          Hidden from the caller until you fix or discard
        </span>
      </div>
      <div className="pk-banner">
        ⚠ <span><b>These leads are paid for.</b> A bad number is worth an email asking for a better one before you discard it.</span>
      </div>

      <div className="cd-stats" style={{ marginBottom: 20 }}>
        {Object.entries(byReason).map(([reason, n]) => {
          const tone = REASON_TONE(reason)
          return (
            <div key={reason} className="cd-stat" style={{ ['--c' as string]: tone.fg }}>
              <b>{n}</b><span>{reason}</span>
            </div>
          )
        })}
        {rows.length === 0 && <div className="cd-stat" style={{ ['--c' as string]: '#00c875' }}><b>0</b><span>All clear</span></div>}
      </div>

      {loading ? <div className="empty">Loading…</div>
        : rows.length === 0 ? <div className="empty">No parked leads. Every number is usable. 🎉</div>
        : (
          <div className="cd-tw"><table className="pk">
            <thead><tr>
              <th style={{ width: '20%' }}>Lead</th><th style={{ width: '14%' }}>Number on file</th>
              <th style={{ width: '16%' }}>Why parked</th><th style={{ width: '20%' }}>New number</th>
              <th style={{ width: '9%' }}>Parked</th><th />
            </tr></thead>
            <tbody>
              {rows.map(r => {
                const tone = REASON_TONE(r.parked_reason)
                const typed = (draft[r.id] ?? '').trim()
                return (
                  <tr key={r.id}>
                    <td><div className="cd-nm">{r.first_name} {r.last_name}</div>
                      <div className="pk-sub">{r.email ?? 'no email'}</div></td>
                    <td><span className="pk-old">{r.phone || '—'}</span></td>
                    <td><span className="pk-rsn" style={{ background: tone.bg, color: tone.fg }}>{r.parked_reason ?? 'Unknown'}</span></td>
                    <td><input type="tel" placeholder="07…" value={draft[r.id] ?? ''}
                      onChange={e => setDraft(d => ({ ...d, [r.id]: e.target.value }))} /></td>
                    <td className="pk-sub">{new Date(r.parked_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td><div className="pk-acts">
                      <a className="cd-btn o" href={`mailto:${r.email ?? ''}?subject=${encodeURIComponent('Your pension guide — can we check your number?')}&body=${encodeURIComponent(`Hi ${r.first_name},\n\nThanks for requesting your guide from My Pension Advisor. We tried to reach you but the number we have (${r.phone}) does not appear to be working.\n\nCould you reply with the best number to reach you on?\n\nMany thanks,\nMy Pension Advisor`)}`}>✉ Ask</a>
                      <button className="cd-btn" disabled={!typed || busy === r.id}
                        onClick={() => act(r.id, 'update_phone', { phone: typed })}>
                        {busy === r.id ? '…' : 'Restore'}
                      </button>
                      <button className="cd-btn o" disabled={busy === r.id} onClick={() => act(r.id, 'unpark')}>As-is</button>
                      <button className="pk-del" disabled={busy === r.id}
                        onClick={() => confirm(`Discard ${r.first_name} ${r.last_name}? This closes the lead permanently.`) && act(r.id, 'discard')}>Discard</button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        )}
    </div>
  )
}
