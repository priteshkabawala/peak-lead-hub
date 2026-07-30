import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { explainMetaCode } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Registers the configured phone number for the WhatsApp Cloud API — the API
 * equivalent of clicking "Register" in WhatsApp Manager.
 *
 * The two-step PIN is read from WHATSAPP_META_PIN, set directly in Vercel by
 * the account owner. It is deliberately NOT accepted in the request body: a PIN
 * sent through a chat, a log or a shell history is a PIN that has leaked. It is
 * never echoed back in any response.
 *
 * Admin-only, and idempotent — re-registering an already-registered number is
 * reported as success rather than treated as an error.
 */
export async function POST(req: Request) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !serviceKey) return NextResponse.json({ error: 'not configured' }, { status: 500 })

  const authToken = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!authToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supa = createClient(supaUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: { user } } = await supa.auth.getUser(authToken)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supa.from('profiles').select('role,name').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

  const token = process.env.WHATSAPP_META_TOKEN
  const phoneNumberId = process.env.WHATSAPP_META_PHONE_NUMBER_ID
  const pin = process.env.WHATSAPP_META_PIN

  if (!token || !phoneNumberId) {
    return NextResponse.json({ error: 'WHATSAPP_META_TOKEN or WHATSAPP_META_PHONE_NUMBER_ID missing' }, { status: 500 })
  }
  if (!pin) {
    return NextResponse.json({
      error: 'WHATSAPP_META_PIN is not set',
      how: 'Set a 6-digit PIN of your choosing in Vercel, then redeploy: npx vercel env add WHATSAPP_META_PIN production',
    }, { status: 400 })
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'WHATSAPP_META_PIN must be exactly 6 digits' }, { status: 400 })
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
  })
  const json = await res.json().catch(() => ({}))

  const code = json?.error?.code
  // 133005 with this subcode means it is already registered — not a failure.
  const alreadyRegistered = code === 133005 && /already/i.test(json?.error?.message ?? '')

  const ok = res.ok || alreadyRegistered

  await supa.from('audit_logs').insert([{
    user_id: user.id, user_name: profile?.name ?? 'admin', user_role: 'admin',
    action: 'WhatsApp number registration attempted', entity_type: 'whatsapp',
    entity_id: phoneNumberId,
    details: { ok, code: code ?? null, message: json?.error?.message ?? null },
  }])

  if (!ok) {
    return NextResponse.json({
      ok: false,
      phoneNumberId,
      error: json?.error?.message ?? `HTTP ${res.status}`,
      code,
      meaning: explainMetaCode(code),
    }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    phoneNumberId,
    alreadyRegistered,
    note: 'Run the preflight to confirm platform_type is now CLOUD_API.',
  })
}
