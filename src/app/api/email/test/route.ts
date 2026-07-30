import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { guideEmailHtml, type EmailVariant } from '@/lib/notify-lead'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Send yourself the real guide email, with the real PDF attached, without
 * creating a lead or notifying the caller.
 *
 * Admin-only. An unauthenticated endpoint that mails arbitrary addresses is a
 * spam relay, so this checks a Supabase session and the admin role before
 * sending anything.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY
  if (!url || !serviceKey || !resendKey) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 })
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supa = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: { user } } = await supa.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supa.from('profiles').select('role,name').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const to: string = body.to
  const variant: EmailVariant = body.variant === 'D' ? 'D' : 'B'
  const firstName: string | null = body.firstName ?? 'Sneha'
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: 'a valid "to" address is required' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.mypensionadvisor.co.uk'
  const guide = { file: 'combine-your-pensions.pdf', title: 'Combining Your Pension Pots' }

  const resend = new Resend(resendKey)
  const { data, error } = await resend.emails.send({
    from: 'My Pension Advisor <noreply@mypensionadvisor.co.uk>',
    to: [to],
    subject: `[TEST ${variant}] Your free guide: ${guide.title}`,
    replyTo: process.env.LEAD_EMAIL_REPLY_TO || 'reece@mypensionadvisor.co.uk',
    attachments: [{ filename: guide.file, path: `${appUrl}/guides/${guide.file}` }],
    html: guideEmailHtml({
      firstName,
      // leadId 0 records nothing, so a test click cannot pollute the A/B stats.
      bookingUrl: process.env.NEXT_PUBLIC_CALENDLY_URL ? `${appUrl}/api/e/book?l=0` : '',
      variant,
      guideTitle: guide.title,
    }),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 502 })

  await supa.from('audit_logs').insert([{
    user_id: user.id, user_name: profile?.name ?? 'admin', user_role: 'admin',
    action: 'Test email sent', entity_type: 'email', entity_id: String(data?.id ?? ''),
    details: { to, variant },
  }])

  return NextResponse.json({ ok: true, id: data?.id, to, variant, attached: guide.file })
}
