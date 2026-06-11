import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runLeadAutomation } from '@/lib/notify-lead'

// Fires the full new-lead automation: guide email, WhatsApp confirmation /
// invalid-phone alert, and admin/caller notifications. Called on lead creation
// from the CRM (the future LinkedIn poller calls runLeadAutomation directly).
//
// Requires a valid signed-in session so the endpoint can't be abused to spam
// emails/WhatsApp by enumerating lead IDs.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: 'not configured' }, { status: 500 })

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { leadId } = await req.json().catch(() => ({}))
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

  try {
    const result = await runLeadAutomation(leadId)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
