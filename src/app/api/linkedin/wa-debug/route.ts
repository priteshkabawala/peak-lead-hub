import { NextResponse } from 'next/server'

// TEMPORARY WhatsApp diagnostic. Secret-protected. Uses the token already in
// Vercel to ask Meta which phone numbers exist under the WABA and whether the
// configured WHATSAPP_META_PHONE_NUMBER_ID is valid/accessible. Delete after use.
export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('secret') !== process.env.LINKEDIN_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const token = process.env.WHATSAPP_META_TOKEN
  const phoneId = process.env.WHATSAPP_META_PHONE_NUMBER_ID
  const waba = url.searchParams.get('waba') // pass ?waba=<WABA_ID>
  if (!token) return NextResponse.json({ error: 'WHATSAPP_META_TOKEN not set' }, { status: 500 })

  const out: Record<string, unknown> = { configuredPhoneNumberId: phoneId }

  // 1. Who does this token belong to?
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`)
    out.tokenInfo = await r.json()
  } catch (e) { out.tokenInfoError = (e as Error).message }

  // 2. What does the configured phone-number ID resolve to (if anything)?
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=id,display_phone_number,verified_name,quality_rating&access_token=${token}`)
    out.configuredPhoneLookup = await r.json()
  } catch (e) { out.configuredPhoneLookupError = (e as Error).message }

  // 2b. Look up an arbitrary object ID passed as ?id=
  const anyId = url.searchParams.get('id')
  if (anyId) {
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${anyId}?fields=id,name,display_phone_number,verified_name,code_verification_status,account_review_status,status&access_token=${token}`)
      out.idLookup = await r.json()
    } catch (e) { out.idLookupError = (e as Error).message }
  }

  // 3. List the phone numbers under the given WABA (the source of truth for IDs)
  if (waba) {
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${waba}/phone_numbers?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating&access_token=${token}`)
      out.wabaPhoneNumbers = await r.json()
    } catch (e) { out.wabaPhoneNumbersError = (e as Error).message }

    // 4. List message templates (exact name + language + status)
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${waba}/message_templates?fields=name,language,status,category&access_token=${token}`)
      out.messageTemplates = await r.json()
    } catch (e) { out.messageTemplatesError = (e as Error).message }
  }

  out.configuredTemplate = { name: process.env.WHATSAPP_META_TEMPLATE_NAME, lang: process.env.WHATSAPP_META_LANG }

  // 5. Optional: send the param-less `hello_world` sample to prove delivery.
  const sendtest = url.searchParams.get('sendtest')
  if (sendtest) {
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: sendtest.replace(/[^\d]/g, ''),
          type: 'template',
          template: { name: 'hello_world', language: { code: 'en_US' } },
        }),
      })
      out.sendTest = await r.json()
    } catch (e) { out.sendTestError = (e as Error).message }
  }

  return NextResponse.json(out)
}
