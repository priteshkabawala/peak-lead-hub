import { createHmac, timingSafeEqual } from 'node:crypto'

// Unsubscribe links must not be guessable. A bare ?lead=123 would let anyone
// walk the ids and unsubscribe every prospect, so each link carries an HMAC of
// the lead id. The service-role key is the signing secret: it is server-only
// and already required for anything that sends mail.

function secret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('SUPABASE_SERVICE_ROLE_KEY required to sign unsubscribe links')
  return s
}

export function unsubToken(leadId: number): string {
  return createHmac('sha256', secret()).update(`unsub:${leadId}`).digest('hex').slice(0, 32)
}

export function verifyUnsubToken(leadId: number, token: string): boolean {
  if (!token || !Number.isFinite(leadId)) return false
  const expected = unsubToken(leadId)
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  // Length check first — timingSafeEqual throws on a length mismatch.
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Full unsubscribe URL for a lead, or '' when we cannot sign one. */
export function unsubscribeUrl(appUrl: string, leadId: number): string {
  try {
    return `${appUrl}/api/e/unsubscribe?l=${leadId}&t=${unsubToken(leadId)}`
  } catch {
    return ''
  }
}
