'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '36px 40px', width: '100%', maxWidth: 400,
      }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            PeaK <span style={{ color: 'var(--gold)' }}>Lead Hub</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Peak Personal Finance — sign in to continue</div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="fg" style={{ marginBottom: 14 }}>
            <label>Email address</label>
            <input
              type="email" required autoFocus
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@mypensionadvisor.co.uk"
            />
          </div>
          <div className="fg" style={{ marginBottom: 22 }}>
            <label>Password</label>
            <input
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 7, padding: '9px 13px', fontSize: 12.5, color: 'var(--red)',
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" className="btn btn-primary"
            style={{ width: '100%', padding: '10px 0', fontSize: 13.5 }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>
          Forgot your password? Contact your admin.
        </div>
      </div>
    </div>
  )
}
