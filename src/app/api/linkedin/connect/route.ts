import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthorizeUrl } from '@/lib/linkedin'
import { randomBytes } from 'crypto'

// Starts the LinkedIn 3-legged OAuth flow. Admin-only (session required).
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: 'not configured' }, { status: 500 })

  const reqUrl = new URL(req.url)
  const token = reqUrl.searchParams.get('token') || ''
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 })

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`
  const redirectUri = `${appUrl}/api/linkedin/callback`
  const state = randomBytes(16).toString('hex')

  const res = NextResponse.redirect(getAuthorizeUrl(redirectUri, state))
  res.cookies.set('li_oauth_state', state, { httpOnly: true, secure: true, maxAge: 600, path: '/' })
  return res
}
