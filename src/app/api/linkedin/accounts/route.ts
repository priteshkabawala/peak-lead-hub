import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken, listAdAccounts } from '@/lib/linkedin'

async function requireAdmin(req: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return admin
}

// Lists the LinkedIn ad accounts the connected user can sync leads from.
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const token = await getValidAccessToken()
    const accounts = await listAdAccounts(token)
    return NextResponse.json({ accounts })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// Sets which ad account leads are synced from.
export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { accountId, accountName } = await req.json().catch(() => ({}))
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const { error } = await admin.from('linkedin_connection').update({
    owner_urn: `urn:li:sponsoredAccount:${accountId}`,
    owner_type: 'sponsoredAccount',
    owner_name: accountName ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
