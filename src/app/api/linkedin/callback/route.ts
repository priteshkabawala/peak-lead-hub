import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exchangeCodeForToken } from '@/lib/linkedin'

// LinkedIn redirects here after the admin approves the OAuth consent screen.
export async function GET(req: Request) {
  const reqUrl = new URL(req.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`
  const settingsUrl = `${appUrl}/crm?tab=linkedin_admin`

  const error = reqUrl.searchParams.get('error')
  if (error) {
    return NextResponse.redirect(`${settingsUrl}&li_error=${encodeURIComponent(error)}`)
  }

  const code = reqUrl.searchParams.get('code')
  const state = reqUrl.searchParams.get('state')
  const cookieState = req.headers.get('cookie')?.match(/li_oauth_state=([^;]+)/)?.[1]

  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(`${settingsUrl}&li_error=invalid_state`)
  }

  try {
    const redirectUri = `${appUrl}/api/linkedin/callback`
    const tokenRes = await exchangeCodeForToken(code, redirectUri)

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await admin.from('linkedin_connection').upsert({
      id: 1,
      access_token: tokenRes.access_token,
      refresh_token: tokenRes.refresh_token ?? null,
      expires_at: new Date(Date.now() + tokenRes.expires_in * 1000).toISOString(),
      refresh_expires_at: tokenRes.refresh_token_expires_in
        ? new Date(Date.now() + tokenRes.refresh_token_expires_in * 1000).toISOString()
        : null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const res = NextResponse.redirect(`${settingsUrl}&li_connected=1`)
    res.cookies.delete('li_oauth_state')
    return res
  } catch (e) {
    return NextResponse.redirect(`${settingsUrl}&li_error=${encodeURIComponent((e as Error).message)}`)
  }
}
