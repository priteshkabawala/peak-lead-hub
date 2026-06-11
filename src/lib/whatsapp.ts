// WhatsApp sender supporting two providers, chosen via WHATSAPP_PROVIDER:
//   'twilio' → Twilio WhatsApp (Content template API)
//   'meta'   → Meta WhatsApp Cloud API (graph.facebook.com)
//
// Business-initiated WhatsApp messages MUST use a Meta-approved template, so
// both paths send a template message with variables {{1}}=name, {{2}}=guide.

export type WhatsAppResult = { ok: boolean; provider?: string; id?: string; error?: string; skipped?: boolean }

// Normalise a UK phone number to E.164 (+44…). Returns null if it can't.
export function toE164UK(raw: string): string | null {
  if (!raw) return null
  let c = raw.replace(/[\s\-()]/g, '')
  if (c.startsWith('+44')) return /^\+44\d{9,10}$/.test(c) ? c : null
  if (c.startsWith('0044')) c = '+' + c.slice(2)
  else if (c.startsWith('44')) c = '+' + c
  else if (c.startsWith('0')) c = '+44' + c.slice(1)
  else return null
  return /^\+44\d{9,10}$/.test(c) ? c : null
}

export async function sendWhatsApp(params: {
  toPhone: string
  leadName: string
  guideTitle: string
}): Promise<WhatsAppResult> {
  const provider = (process.env.WHATSAPP_PROVIDER || '').toLowerCase()
  if (!provider) return { ok: false, skipped: true, error: 'WhatsApp not configured' }

  const to = toE164UK(params.toPhone)
  if (!to) return { ok: false, error: 'phone not E.164-convertible' }

  const name = (params.leadName || 'there').slice(0, 60)
  const guide = (params.guideTitle || 'your free guide').slice(0, 80)

  try {
    if (provider === 'twilio') return await sendViaTwilio(to, name, guide)
    if (provider === 'meta') return await sendViaMeta(to, name, guide)
    return { ok: false, error: `unknown WHATSAPP_PROVIDER: ${provider}` }
  } catch (e) {
    return { ok: false, provider, error: (e as Error).message }
  }
}

// ── Twilio ──────────────────────────────────────────────────────────────────
async function sendViaTwilio(to: string, name: string, guide: string): Promise<WhatsAppResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM            // e.g. +447xxxxxxxxx
  const contentSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID // approved Content template SID
  if (!sid || !token || !from || !contentSid) return { ok: false, error: 'Twilio env vars missing' }

  const body = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: `whatsapp:${from}`,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify({ '1': name, '2': guide }),
  })

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, provider: 'twilio', error: json.message || `HTTP ${res.status}` }
  return { ok: true, provider: 'twilio', id: json.sid }
}

// ── Meta WhatsApp Cloud API ──────────────────────────────────────────────────
async function sendViaMeta(to: string, name: string, guide: string): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_META_TOKEN
  const phoneNumberId = process.env.WHATSAPP_META_PHONE_NUMBER_ID
  const template = process.env.WHATSAPP_META_TEMPLATE_NAME
  const lang = process.env.WHATSAPP_META_LANG || 'en_GB'
  if (!token || !phoneNumberId || !template) return { ok: false, error: 'Meta env vars missing' }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace('+', ''),
      type: 'template',
      template: {
        name: template,
        language: { code: lang },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: name },
            { type: 'text', text: guide },
          ],
        }],
      },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, provider: 'meta', error: json?.error?.message || `HTTP ${res.status}` }
  return { ok: true, provider: 'meta', id: json?.messages?.[0]?.id }
}
