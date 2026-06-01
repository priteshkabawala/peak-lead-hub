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

  const EMAIL = 'priteshkabawala@gmail.com'
  const OLD_ID = '43b3bcbf-cd94-4654-93d7-5bb8a28834f4'

  // Step 1: delete the broken manually-created user
  await supabaseAdmin.auth.admin.deleteUser(OLD_ID)

  // Also clean up the orphaned profile row (ignore errors)
  await supabaseAdmin.from('profiles').delete().eq('id', OLD_ID)

  // Step 2: create a fresh user via GoTrue so all internal state is correct
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: EMAIL,
    password: 'PeaK@2026!',
    email_confirm: true,
    user_metadata: { name: 'Pritesh Kabawala' },
  })

  if (error) return NextResponse.json({ step: 'createUser', error: error.message }, { status: 500 })

  // Step 3: insert admin profile
  const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
    id: data.user.id,
    email: EMAIL,
    name: 'Pritesh Kabawala',
    role: 'admin',
    active: true,
  }])

  if (profileError) return NextResponse.json({ step: 'profile', error: profileError.message }, { status: 500 })

  return NextResponse.json({ success: true, email: data.user.id })
}
