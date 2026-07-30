import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp, toE164UK, explainMetaCode } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 30

// Admin-only WhatsApp diagnostics.
//
//   GET  → preflight. Reads config and asks Meta what it thinks, WITHOUT
//          sending a message. Tells you which of the usual five faults you are
//          in before you burn a send.
//   POST → sends the real approved template to one number, returning Meta's
//          actual error code rather than swallowing it.
//
// Never returns token or secret values, only whether they are present.

const GRAPH = 'https://graph.facebook.com/v21.0'

async function requireAdmin(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { error: NextResponse.json({ error: 'not configured' }, { status: 500 }) }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!token) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }

  const supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: { user } } = await supa.auth.getUser(token)
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const { data: profile } = await supa.from('profiles').select('role,name').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'admin only' }, { status: 403 }) }
  return { supa, user, profile }
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const token = process.env.WHATSAPP_META_TOKEN
  const phoneNumberId = process.env.WHATSAPP_META_PHONE_NUMBER_ID
  const template = process.env.WHATSAPP_META_TEMPLATE_NAME
  const lang = process.env.WHATSAPP_META_LANG || 'en_GB'
  const wabaId = process.env.WHATSAPP_META_WABA_ID

  const report: Record<string, unknown> = {
    provider: process.env.WHATSAPP_PROVIDER || null,
    config: {
      WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || null,
      WHATSAPP_META_TOKEN: token ? `present (${token.length} chars)` : 'MISSING',
      WHATSAPP_META_PHONE_NUMBER_ID: phoneNumberId || 'MISSING',
      WHATSAPP_META_TEMPLATE_NAME: template || 'MISSING',
      WHATSAPP_META_LANG: lang,
      WHATSAPP_META_WABA_ID: wabaId || 'not set (template check skipped)',
    },
  }
  const problems: string[] = []

  if (!token || !phoneNumberId || !template) {
    problems.push('Required Meta env vars are missing — nothing else can be checked.')
    return NextResponse.json({ ok: false, ...report, problems }, { status: 200 })
  }

  // 1 ─ Does the token work, and is this number actually registered?
  try {
    const res = await fetch(
      `${GRAPH}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,throughput`,
      { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const code = json?.error?.code
      report.number = { error: json?.error?.message, code, meaning: explainMetaCode(code) }
      problems.push(explainMetaCode(code) || `Meta rejected the phone number lookup: ${json?.error?.message}`)
    } else {
      report.number = {
        display: json.display_phone_number,
        verifiedName: json.verified_name,
        quality: json.quality_rating,
        codeVerification: json.code_verification_status,
        platform: json.platform_type,
      }
      // platform_type CLOUD_API is the thing that proves registration worked.
      if (json.platform_type && json.platform_type !== 'CLOUD_API') {
        problems.push(`Number is on ${json.platform_type}, not CLOUD_API — it is not registered for the Cloud API yet.`)
      }
      if (json.code_verification_status && json.code_verification_status !== 'VERIFIED') {
        problems.push(`Number verification status is ${json.code_verification_status} — complete SMS or voice verification.`)
      }
    }
  } catch (e) {
    problems.push(`Could not reach Meta: ${(e as Error).message}`)
  }

  // 2 ─ What numbers exist on this WABA, and what is each one's ID and state?
  //     This is how you find the Phone Number ID to put in the env var, and
  //     whether a number is merely verified or actually registered.
  if (wabaId) {
    try {
      const res = await fetch(
        `${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,code_verification_status,platform_type,status,quality_rating,name_status,new_name_status,account_mode,is_pin_enabled,is_official_business_account`,
        { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        report.wabaNumbers = { error: json?.error?.message, code: json?.error?.code }
        problems.push(`Could not list numbers on WABA ${wabaId}: ${json?.error?.message}`)
      } else {
        const nums = (json.data ?? []) as Array<Record<string, unknown>>
        report.wabaNumbers = nums.map(n => ({
          phoneNumberId: n.id,
          display: n.display_phone_number,
          verifiedName: n.verified_name,
          verification: n.code_verification_status,
          platform: n.platform_type,
          status: n.status,
          // A display name still under review, or a PIN already enabled from a
          // previous registration, both cause Meta's generic "Registration
          // failed" with no further explanation.
          nameStatus: n.name_status,
          newNameStatus: n.new_name_status,
          pinAlreadyEnabled: n.is_pin_enabled,
          accountMode: n.account_mode,
          isCurrentlyConfigured: n.id === phoneNumberId,
        }))
        const live = nums.find(n => String(n.display_phone_number ?? '').replace(/\D/g, '').endsWith('7877651518'))
        if (live) {
          report.ukNumber = {
            phoneNumberId: live.id,
            verification: live.code_verification_status,
            platform: live.platform_type,
            status: live.status,
          }
          if (live.id !== phoneNumberId) {
            problems.push(`The UK number exists with Phone Number ID ${live.id}, but WHATSAPP_META_PHONE_NUMBER_ID is still ${phoneNumberId}. Swap it and redeploy.`)
          }
          if (live.platform_type !== 'CLOUD_API') {
            problems.push(`UK number is not registered for Cloud API yet (platform: ${live.platform_type ?? 'none'}).`)
          }
          // Narrow down Meta's unhelpful "Registration failed. Please try again".
          if (live.name_status && live.name_status !== 'APPROVED') {
            problems.push(`Display name status is ${live.name_status} — registration fails while the name is not APPROVED.`)
          }
          if (live.new_name_status && !['NONE', 'APPROVED'].includes(String(live.new_name_status))) {
            problems.push(`A display name change is ${live.new_name_status} — wait for it to clear before registering.`)
          }
          if (live.is_pin_enabled) {
            problems.push('This number already has a two-step PIN from a previous registration. Registration needs THAT PIN, not a new one — reset it in WhatsApp Manager if it is lost.')
          }
        } else {
          problems.push('No number ending 7877651518 found on this WABA — add and verify it first.')
        }
      }

      // WABA-level review state — an unreviewed account cannot register.
      try {
        const wres = await fetch(
          `${GRAPH}/${wabaId}?fields=name,account_review_status,business_verification_status,country,ownership_type`,
          { headers: { Authorization: `Bearer ${token}` } })
        const wj = await wres.json().catch(() => ({}))
        if (wres.ok) {
          report.waba = {
            name: wj.name,
            accountReview: wj.account_review_status,
            businessVerification: wj.business_verification_status,
            country: wj.country,
          }
          if (wj.account_review_status && wj.account_review_status !== 'APPROVED') {
            problems.push(`WABA account review status is ${wj.account_review_status} — Meta blocks registration until this is APPROVED.`)
          }
          if (wj.business_verification_status && wj.business_verification_status !== 'verified') {
            problems.push(`Business verification is "${wj.business_verification_status}". Unverified businesses are capped at 250 recipients per day, and some registrations are blocked outright.`)
          }
        } else {
          report.waba = { error: wj?.error?.message, code: wj?.error?.code }
        }
      } catch { /* non-fatal */ }
    } catch (e) {
      problems.push(`Number listing failed: ${(e as Error).message}`)
    }
  }

  // 3 ─ Is the template approved, under this WABA, in this language?
  if (wabaId) {
    try {
      const res = await fetch(
        `${GRAPH}/${wabaId}/message_templates?name=${encodeURIComponent(template)}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        report.template = { error: json?.error?.message, code: json?.error?.code }
        problems.push(`Could not list templates: ${json?.error?.message}`)
      } else {
        const found = (json.data ?? []) as Array<Record<string, unknown>>
        const match = found.find(t => t.name === template && t.language === lang)
        report.template = {
          searchedFor: `${template} / ${lang}`,
          found: found.map(t => ({ name: t.name, language: t.language, status: t.status })),
        }
        if (!found.length) {
          problems.push(`Template "${template}" does not exist in this WABA — if the number moved WABA, resubmit it.`)
        } else if (!match) {
          problems.push(`Template "${template}" exists but not in language ${lang}. Set WHATSAPP_META_LANG to one of: ${found.map(t => t.language).join(', ')}`)
        } else if (match.status !== 'APPROVED') {
          problems.push(`Template is ${match.status}, not APPROVED.`)
        } else {
          // Confirm it still takes exactly the 2 variables the code sends.
          const comps = (match.components ?? []) as Array<Record<string, unknown>>
          const bodyText = String(comps.find(c => c.type === 'BODY')?.text ?? '')
          const vars = new Set(bodyText.match(/\{\{\d+\}\}/g) ?? [])
          report.templateVars = { expected: 2, found: vars.size, placeholders: [...vars] }
          if (vars.size !== 2) {
            problems.push(`Template body uses ${vars.size} variable(s); the code sends 2 ({{1}}=name, {{2}}=guide).`)
          }
        }
      }
    } catch (e) {
      problems.push(`Template check failed: ${(e as Error).message}`)
    }
  }

  return NextResponse.json({ ok: problems.length === 0, ...report, problems })
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({}))
  const to = String(body.to ?? '')
  const e164 = toE164UK(to)
  if (!e164) {
    return NextResponse.json({ error: `"${to}" is not a UK number we can convert to E.164` }, { status: 400 })
  }

  const result = await sendWhatsApp({
    toPhone: e164,
    leadName: body.name ?? 'Pritesh',
    guideTitle: body.guide ?? 'Combining Your Pension Pots',
  })

  await auth.supa.from('audit_logs').insert([{
    user_id: auth.user.id, user_name: auth.profile?.name ?? 'admin', user_role: 'admin',
    action: 'WhatsApp test sent', entity_type: 'whatsapp', entity_id: result.id ?? '',
    details: { to: e164, ok: result.ok, error: result.error ?? null, code: result.code ?? null },
  }])

  return NextResponse.json({
    ...result,
    to: e164,
    meaning: result.ok ? null : explainMetaCode(result.code),
  }, { status: result.ok ? 200 : 502 })
}
