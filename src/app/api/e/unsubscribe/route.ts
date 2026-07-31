import { createClient } from '@supabase/supabase-js'
import { verifyUnsubToken } from '@/lib/unsubscribe'

export const runtime = 'nodejs'

/**
 * Unsubscribe from the guide email.
 *
 *   GET  → a confirmation page with a button.
 *   POST → actually unsubscribes.
 *
 * The split matters: mail clients and security scanners prefetch links in
 * emails, so a GET that unsubscribed immediately would quietly opt people out
 * who never clicked anything. Mail clients that support RFC 8058 one-click
 * send a POST directly, which is handled here too.
 */

const page = (title: string, body: string, button?: { leadId: number; token: string }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · My Pension Advisor</title></head>
<body style="margin:0;background:#f4f6fb;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a">
  <div style="max-width:460px;margin:12vh auto;padding:32px 28px;background:#fff;border:1px solid #e3e8f0;border-radius:12px">
    <h1 style="margin:0 0 12px;font-size:20px">${title}</h1>
    <p style="font-size:14.5px;line-height:1.6;color:#334155;margin:0 0 20px">${body}</p>
    ${button ? `<form method="POST" action="/api/e/unsubscribe">
      <input type="hidden" name="l" value="${button.leadId}">
      <input type="hidden" name="t" value="${button.token}">
      <button type="submit" style="background:#2563eb;color:#fff;border:none;font-family:inherit;font-weight:700;font-size:15px;padding:13px 24px;border-radius:9px;cursor:pointer">Yes, unsubscribe me</button>
    </form>` : ''}
    <p style="font-size:12px;color:#94a3b8;margin:24px 0 0;border-top:1px solid #e3e8f0;padding-top:14px">
      My Pension Advisor · mypensionadvisor.co.uk
    </p>
  </div>
</body></html>`

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })

function parse(url: URL, form?: FormData) {
  const leadId = Number(form?.get('l') ?? url.searchParams.get('l'))
  const token = String(form?.get('t') ?? url.searchParams.get('t') ?? '')
  return { leadId, token }
}

export async function GET(req: Request) {
  const { leadId, token } = parse(new URL(req.url))
  if (!verifyUnsubToken(leadId, token)) {
    return html(page('Link not recognised',
      'This unsubscribe link is invalid or has expired. Please reply to any of our emails and we will remove you.'), 400)
  }
  return html(page(
    'Unsubscribe',
    'You are about to stop receiving emails from My Pension Advisor. Please confirm.',
    { leadId, token }))
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  let form: FormData | undefined
  try { form = await req.formData() } catch { /* RFC 8058 clients may send no body */ }
  const { leadId, token } = parse(url, form)

  if (!verifyUnsubToken(leadId, token)) {
    return html(page('Link not recognised',
      'This unsubscribe link is invalid. Please reply to any of our emails and we will remove you.'), 400)
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !key) {
    return html(page('Something went wrong',
      'We could not process that just now. Please reply to any of our emails and we will remove you.'), 500)
  }

  const supa = createClient(supaUrl, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await supa.from('leads')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) {
    console.error('[unsubscribe] failed:', error.message)
    return html(page('Something went wrong',
      'We could not process that just now. Please reply to any of our emails and we will remove you.'), 500)
  }

  return html(page('You have been unsubscribed',
    'You will not receive any further emails from us. If this was a mistake, just reply to one of our previous emails.'))
}
