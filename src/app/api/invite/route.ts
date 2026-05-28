import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789!@#'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: Request) {
  const { name, email } = await req.json()
  if (!name || !email) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
  }

  // Initialise clients inside handler so they never run at build time
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const resend = new Resend(process.env.RESEND_API_KEY)

  const tempPassword = generatePassword()

  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
    id: user.user.id,
    email,
    name,
    role: 'caller',
    active: true,
  }])

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(user.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://peak-lead-hub.vercel.app'

  await resend.emails.send({
    from: 'PeaK Lead Hub <noreply@mypensionadvisor.co.uk>',
    to: email,
    subject: 'Your PeaK Lead Hub access',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0c1526;color:#e2e8f0;border-radius:12px">
        <h2 style="margin:0 0 6px;font-size:20px">Welcome to <span style="color:#f0b429">PeaK Lead Hub</span></h2>
        <p style="color:#8ea3c3;font-size:13px;margin:0 0 24px">Peak Personal Finance</p>
        <p style="font-size:14px;margin:0 0 20px">Hi ${name},</p>
        <p style="font-size:14px;margin:0 0 20px">
          You've been added to the PeaK Lead Hub as a caller. Use the credentials below to sign in.
        </p>
        <div style="background:#13203a;border:1px solid #263d6e;border-radius:9px;padding:18px 20px;margin-bottom:24px">
          <div style="font-size:12px;color:#8ea3c3;margin-bottom:4px">Login URL</div>
          <div style="font-size:14px;margin-bottom:14px"><a href="${appUrl}" style="color:#3b82f6">${appUrl}</a></div>
          <div style="font-size:12px;color:#8ea3c3;margin-bottom:4px">Email</div>
          <div style="font-size:14px;margin-bottom:14px">${email}</div>
          <div style="font-size:12px;color:#8ea3c3;margin-bottom:4px">Temporary password</div>
          <div style="font-size:16px;font-weight:700;letter-spacing:1px;color:#f0b429">${tempPassword}</div>
        </div>
        <p style="font-size:13px;color:#8ea3c3;margin:0">
          Please change your password after your first login. Contact your admin if you have any issues.
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true, userId: user.user.id })
}
