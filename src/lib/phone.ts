import parsePhoneNumberFromString from 'libphonenumber-js'

// Phone validation for UK lead intake.
//
// Replaces the old regex. A lead only reaches the caller if we believe the
// number is a real, callable UK mobile. Anything doubtful is parked for the
// admin rather than wasting the caller's time on a paid-for lead.

export type PhoneVerdict = {
  ok: boolean            // safe to hand to the caller
  e164: string | null    // normalised +44… form
  type: string | null    // MOBILE | FIXED_LINE | VOIP | …
  reason: string | null  // why it was rejected, shown to the admin
}

/**
 * Layer 1: format and line-type validation. Free, offline, no API call.
 * Catches foreign numbers, landlines, impossible lengths and obvious
 * placeholders like 07342000000.
 */
export function checkPhone(raw: string | null | undefined): PhoneVerdict {
  const input = (raw ?? '').trim()
  if (!input) return { ok: false, e164: null, type: null, reason: 'No phone number' }

  const parsed = parsePhoneNumberFromString(input, 'GB')

  if (!parsed) return { ok: false, e164: null, type: null, reason: 'Not a usable phone number' }
  if (!parsed.isValid()) {
    return { ok: false, e164: null, type: null, reason: 'Not a valid number' }
  }
  if (parsed.country !== 'GB') {
    return {
      ok: false,
      e164: parsed.number,
      type: parsed.getType() ?? null,
      reason: `Not a UK number (${parsed.country ?? 'unknown country'})`,
    }
  }

  const type = parsed.getType() ?? null

  // Landlines answer far less often and cannot receive SMS follow-up, so they
  // go to the admin rather than straight to the caller.
  if (type === 'FIXED_LINE') {
    return { ok: false, e164: parsed.number, type, reason: 'Landline, not a mobile' }
  }
  if (type && type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') {
    return { ok: false, e164: parsed.number, type, reason: `Not a mobile (${type})` }
  }

  // Placeholder sniff: a real mobile is not a run of repeated digits.
  const digits = parsed.nationalNumber
  if (/^(\d)\1{6,}$/.test(digits.slice(-9)) || /0{6,}$/.test(digits)) {
    return { ok: false, e164: parsed.number, type, reason: 'Looks like a placeholder number' }
  }

  return { ok: true, e164: parsed.number, type, reason: null }
}

/**
 * Layer 2: carrier lookup. Confirms the line actually exists on a network.
 * Optional and paid (roughly 1p per lookup), enabled by setting
 * PHONE_LOOKUP_PROVIDER=twilio. Returns null when not configured so callers
 * can fall back to the Layer 1 verdict.
 */
export async function carrierLookup(e164: string): Promise<PhoneVerdict | null> {
  if ((process.env.PHONE_LOOKUP_PROVIDER || '').toLowerCase() !== 'twilio') return null
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) return null

  try {
    const res = await fetch(
      `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`,
      { headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') } }
    )
    const json = await res.json()
    if (!res.ok) return null // lookup unavailable, do not block intake on it

    if (json.valid === false) {
      return { ok: false, e164, type: null, reason: 'Carrier lookup: number not in service' }
    }
    const lineType: string | null = json?.line_type_intelligence?.type ?? null
    if (lineType && !['mobile', 'fixedLineOrMobile', 'nonFixedVoip'].includes(lineType)) {
      return { ok: false, e164, type: lineType, reason: `Carrier lookup: ${lineType}, not a mobile` }
    }
    return { ok: true, e164, type: lineType, reason: null }
  } catch {
    return null // never fail lead intake because a paid lookup was down
  }
}

/** Full check: Layer 1, then Layer 2 when configured. */
export async function verifyPhone(raw: string | null | undefined): Promise<PhoneVerdict> {
  const basic = checkPhone(raw)
  if (!basic.ok || !basic.e164) return basic
  const carrier = await carrierLookup(basic.e164)
  return carrier ?? basic
}
