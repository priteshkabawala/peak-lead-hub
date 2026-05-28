'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, type AuditLog } from '@/lib/supabase'

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('')

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error) setLogs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const users = Array.from(new Set(logs.map(l => l.user_name)))
  const actions = Array.from(new Set(logs.map(l => l.action)))

  const filtered = logs.filter(l => {
    if (filterUser && l.user_name !== filterUser) return false
    if (filterAction && l.action !== filterAction) return false
    return true
  })

  const actionColor = (action: string) => {
    if (action.includes('deactivated')) return 'var(--red)'
    if (action.includes('reactivated') || action.includes('invited') || action.includes('added')) return 'var(--green)'
    if (action.includes('updated') || action.includes('changed')) return 'var(--amber)'
    return 'var(--accent)'
  }

  return (
    <div style={{ padding: '24px 24px 60px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Audit Log</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>Notable actions by all team members</div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All users</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">All actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>
          {filtered.length} entries
        </span>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={fetchLogs}>
          ↻ Refresh
        </button>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Entity</th><th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty">Loading…</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{log.user_name}</td>
                  <td>
                    <span className={`pill ${log.user_role === 'admin' ? 'p-qualified' : 'p-new'}`} style={{ fontSize: 10.5 }}>
                      {log.user_role}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: actionColor(log.action) }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {log.entity_type ?? '—'}
                    {log.entity_id ? <span style={{ marginLeft: 4, fontSize: 10.5 }}>#{log.entity_id.slice(0, 8)}</span> : null}
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--muted)', maxWidth: 260 }}>
                    {log.details ? (
                      <span title={JSON.stringify(log.details, null, 2)}>
                        {Object.entries(log.details)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')
                          .slice(0, 80)}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="empty">No audit entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
