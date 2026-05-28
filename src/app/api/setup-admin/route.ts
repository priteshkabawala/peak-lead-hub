import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ONE-TIME SETUP ENDPOINT — delete after use
export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (secret !== 'peak-setup-2026') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    '43b3bcbf-cd94-4654-93d7-5bb8a28834f4',
    { password: 'PeaK@2026!', email_confirm: true }
  )

  const debug = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
    keyStart: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20),
    keyEnd: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-10),
  }

  if (error) return NextResponse.json({ error: error.message, debug }, { status: 500 })
  return NextResponse.json({ success: true, email: data.user.email, debug })
}
