import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runLinkedInSync } from '@/lib/linkedin'

// Manual "Sync now" trigger from the CRM admin UI (session-protected).
export async function POST(req: Request) {
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

  const result = await runLinkedInSync()
  return NextResponse.json(result, { status: result.error ? 400 : 200 })
}
