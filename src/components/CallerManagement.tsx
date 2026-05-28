'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, logAudit, type Profile } from '@/lib/supabase'

interface Props {
  currentUser: Profile
  onNotif: (msg: string, color?: string) => void
}

export default function CallerManagement({ currentUser, onNotif }: Props) {
  const [callers, setCallers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const fetchCallers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { onNotif('⚠ Failed to load callers', 'var(--red)'); return }
    setCallers(data ?? [])
    setLoading(false)
  }, [onNotif])

  useEffect(() => { fetchCallers() }, [fetchCallers])

  const handleInvite = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      onNotif('⚠ Name and email are required', 'var(--amber)'); return
    }
    setSaving(true)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), email: newEmail.trim().toLowerCase() }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { onNotif('⚠ ' + json.error, 'var(--red)'); return }

    await logAudit({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role,
      action: 'Caller invited',
      entity_type: 'caller',
      details: { name: newName.trim(), email: newEmail.trim().toLowerCase() },
    })

    onNotif(`✅ Invite sent to ${newEmail}`)
    setNewName(''); setNewEmail(''); setShowAdd(false)
    fetchCallers()
  }

  const handleToggleActive = async (caller: Profile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ active: !caller.active })
      .eq('id', caller.id)
    if (error) { onNotif('⚠ Update failed', 'var(--red)'); return }

    await logAudit({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role,
      action: caller.active ? 'Caller deactivated' : 'Caller reactivated',
      entity_type: 'caller',
      entity_id: caller.id,
      details: { name: caller.name, email: caller.email },
    })

    onNotif(`✅ ${caller.name} ${caller.active ? 'deactivated' : 'reactivated'}`)
    setCallers(prev => prev.map(c => c.id === caller.id ? { ...c, active: !c.active } : c))
  }

  const handleEditSave = async (caller: Profile) => {
    if (!editName.trim()) return
    const { error } = await supabase
      .from('profiles')
      .update({ name: editName.trim() })
      .eq('id', caller.id)
    if (error) { onNotif('⚠ Update failed', 'var(--red)'); return }

    await logAudit({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role,
      action: 'Caller name updated',
      entity_type: 'caller',
      entity_id: caller.id,
      details: { old_name: caller.name, new_name: editName.trim() },
    })

    onNotif('✅ Name updated')
    setCallers(prev => prev.map(c => c.id === caller.id ? { ...c, name: editName.trim() } : c))
    setEditId(null)
  }

  return (
    <div style={{ padding: '24px 24px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Caller Management</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>Add, edit, or deactivate team members</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>
          {showAdd ? '✕ Cancel' : '+ Add Caller'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-head"><span className="card-title">Invite new caller</span></div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
              <div className="fg">
                <label>Full name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="fg">
                <label>Email address</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleInvite} disabled={saving}>
              {saving ? 'Sending invite…' : '📧 Send invite email'}
            </button>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 10 }}>
              Login credentials will be emailed from noreply@mypensionadvisor.co.uk
            </span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <span className="card-title">Team members ({callers.length})</span>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty">Loading…</td></tr>
              ) : callers.map(c => (
                <tr key={c.id}>
                  <td>
                    {editId === c.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          value={editName} onChange={e => setEditName(e.target.value)}
                          style={{ padding: '4px 8px', fontSize: 12.5, width: 150 }}
                          onKeyDown={e => e.key === 'Enter' && handleEditSave(c)}
                        />
                        <button className="btn btn-primary btn-sm" onClick={() => handleEditSave(c)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>✕</button>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{c.email}</td>
                  <td>
                    <span className={`pill ${c.role === 'admin' ? 'p-qualified' : 'p-new'}`}>
                      {c.role}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${c.active ? 'p-qualified' : 'p-cold'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {new Date(c.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {editId !== c.id && c.id !== currentUser.id && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setEditId(c.id); setEditName(c.name) }}
                        >
                          ✏ Edit
                        </button>
                      )}
                      {c.id !== currentUser.id && (
                        <button
                          className={`btn btn-sm ${c.active ? 'btn-red' : 'btn-green'}`}
                          onClick={() => handleToggleActive(c)}
                        >
                          {c.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                      {c.id === currentUser.id && (
                        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>— you</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && callers.length === 0 && (
                <tr><td colSpan={6} className="empty">No team members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
