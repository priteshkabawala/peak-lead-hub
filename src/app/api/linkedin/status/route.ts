import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await supa.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supa.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: conn } = await supa.from('linkedin_connection').select('*').eq('id', 1).single()

  return NextResponse.json({
    connected: !!conn?.access_token,
    ownerUrn: conn?.owner_urn ?? null,
    ownerName: conn?.owner_name ?? null,
    lastSyncedAt: conn?.last_synced_at ?? null,
    connectedAt: conn?.connected_at ?? null,
    expiresAt: conn?.expires_at ?? null,
  })
}
