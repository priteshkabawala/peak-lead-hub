'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Status = {
  connected: boolean
  ownerUrn: string | null
  ownerName: string | null
  lastSyncedAt: string | null
  connectedAt: string | null
  expiresAt: string | null
}

type Account = { id: number; name: string; test: boolean }

interface Props {
  onNotif: (msg: string, color?: string) => void
}

async function authedFetch(path: string, opts: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(opts.headers)
  headers.set('Authorization', `Bearer ${session?.access_token ?? ''}`)
  headers.set('Content-Type', 'application/json')
  return fetch(path, { ...opts, headers })
}

export default function LinkedInAdmin({ onNotif }: Props) {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const fetchStatus = useCallback(async () => {
    const res = await authedFetch('/api/linkedin/status')
    if (res.ok) setStatus(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // Surface OAuth callback result from the redirect query params.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('li_error')
    const connected = params.get('li_connected')
    if (err) onNotif('⚠ LinkedIn connection failed: ' + err, 'var(--red)')
    if (connected) { onNotif('✅ LinkedIn connected'); fetchStatus() }
    if (err || connected) {
      const url = new URL(window.location.href)
      url.searchParams.delete('li_error'); url.searchParams.delete('li_connected')
      window.history.replaceState({}, '', url.toString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    window.location.href = `/api/linkedin/connect?token=${encodeURIComponent(session?.access_token ?? '')}`
  }

  const loadAccounts = async () => {
    setLoadingAccounts(true)
    const res = await authedFetch('/api/linkedin/accounts')
    const json = await res.json()
    setLoadingAccounts(false)
    if (!res.ok) { onNotif('⚠ ' + json.error, 'var(--red)'); return }
    setAccounts(json.accounts ?? [])
  }

  const selectAccount = async (a: Account) => {
    const res = await authedFetch('/api/linkedin/accounts', {
      method: 'POST',
      body: JSON.stringify({ accountId: a.id, accountName: a.name }),
    })
    const json = await res.json()
    if (!res.ok) { onNotif('⚠ ' + json.error, 'var(--red)'); return }
    onNotif(`✅ Syncing leads from "${a.name}"`)
    fetchStatus()
  }

  const syncNow = async () => {
    setSyncing(true)
    const res = await authedFetch('/api/linkedin/sync', { method: 'POST' })
    const json = await res.json()
    setSyncing(false)
    if (!res.ok) { onNotif('⚠ Sync failed: ' + json.error, 'var(--red)'); return }
    onNotif(`✅ Sync complete — ${json.imported} imported, ${json.skipped} already had, ${json.failed} failed`)
    fetchStatus()
  }

  return (
    <div style={{ padding: '24px 24px 60px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>LinkedIn Lead Sync</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
          Automatically import leads from your LinkedIn Lead Gen Forms
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          <div className="card">
            <div className="card-head"><span className="card-title">Connection</span></div>
            <div className="card-body">
              {!status?.connected ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
                    Not connected. Connect your LinkedIn account to start syncing leads automatically.
                  </div>
                  <button className="btn btn-primary" onClick={connect}>🔗 Connect LinkedIn</button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span className="pill p-qualified">Connected</span>
                    {status.connectedAt && (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        since {new Date(status.connectedAt).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Syncing leads from</div>
                    {status.ownerName ? (
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{status.ownerName}</div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: 'var(--amber)' }}>⚠ No ad account selected yet</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 14 }}>
                    <button className="btn btn-ghost btn-sm" onClick={loadAccounts} disabled={loadingAccounts}>
                      {loadingAccounts ? 'Loading…' : (status.ownerName ? 'Change ad account' : 'Choose ad account')}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={syncNow} disabled={syncing || !status.ownerName}>
                      {syncing ? 'Syncing…' : '↻ Sync now'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={connect}>🔄 Reconnect</button>
                  </div>

                  {accounts.length > 0 && (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
                      {accounts.map(a => (
                        <div key={a.id} onClick={() => selectAccount(a)} style={{
                          padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                          borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
                        }}>
                          <span>{a.name} {a.test && <span className="tag tag-mgr">test</span>}</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Select →</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    Last synced: {status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString('en-GB') : 'never'}
                    {' · '}Auto-syncs every 10 minutes via scheduled job
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><span className="card-title">How it works</span></div>
            <div className="card-body" style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.7 }}>
              New submissions on your LinkedIn Lead Gen Forms are pulled in automatically (every ~10 minutes, or
              instantly with &quot;Sync now&quot;). Each lead is deduplicated, scored, and triggers the same automation as a
              manually added lead: a personalised guide email, a WhatsApp confirmation (if the phone is valid), and
              notifications to admins and callers.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
