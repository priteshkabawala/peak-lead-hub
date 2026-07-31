import { describe, it, expect, beforeAll } from 'vitest'

// The signing key is read at call time, so it must exist before importing.
beforeAll(() => { process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key' })

const load = async () => await import('@/lib/unsubscribe')

describe('unsubscribe link signing', () => {
  it('produces a stable token for a lead', async () => {
    const { unsubToken } = await load()
    expect(unsubToken(42)).toBe(unsubToken(42))
  })

  it('gives different leads different tokens', async () => {
    const { unsubToken } = await load()
    expect(unsubToken(42)).not.toBe(unsubToken(43))
  })

  it('accepts its own token', async () => {
    const { unsubToken, verifyUnsubToken } = await load()
    expect(verifyUnsubToken(42, unsubToken(42))).toBe(true)
  })

  // Without signing, anyone could walk the lead ids and unsubscribe every
  // prospect in the database.
  it('rejects another lead\'s token', async () => {
    const { unsubToken, verifyUnsubToken } = await load()
    expect(verifyUnsubToken(43, unsubToken(42))).toBe(false)
  })

  it('rejects a missing, empty or malformed token', async () => {
    const { verifyUnsubToken } = await load()
    for (const bad of ['', 'x', 'deadbeef', 'z'.repeat(32)]) {
      expect(verifyUnsubToken(42, bad)).toBe(false)
    }
  })

  it('rejects a non-numeric lead id without throwing', async () => {
    const { verifyUnsubToken, unsubToken } = await load()
    expect(verifyUnsubToken(NaN, unsubToken(42))).toBe(false)
  })

  it('builds a URL carrying both the id and the signature', async () => {
    const { unsubscribeUrl } = await load()
    const url = unsubscribeUrl('https://crm.example.com', 42)
    expect(url).toContain('/api/e/unsubscribe?l=42&t=')
    expect(url.split('t=')[1].length).toBe(32)
  })
})

describe('the email footer', () => {
  it('carries the FCA wording exactly as supplied', async () => {
    const { guideEmailHtml } = await import('@/lib/notify-lead')
    for (const variant of ['B', 'D'] as const) {
      const html = guideEmailHtml({
        firstName: 'Sneha', bookingUrl: 'https://x/y', variant,
        unsubscribeUrl: 'https://crm.example.com/api/e/unsubscribe?l=42&t=abc',
      })
      expect(html).toContain('All of our financial advisers are authorised and')
      expect(html).toContain('regulated by the Financial Conduct Authority (FCA)')
      expect(html).toContain('If you no longer wish to receive these communications')
      expect(html).toContain('href="https://crm.example.com/api/e/unsubscribe?l=42&t=abc"')
      expect(html).toContain('to unsubscribe')
    }
  })

  // A "click here" pointing nowhere is worse than plain text.
  it('falls back to replying when no unsubscribe URL can be signed', async () => {
    const { guideEmailHtml } = await import('@/lib/notify-lead')
    for (const variant of ['B', 'D'] as const) {
      const html = guideEmailHtml({ firstName: 'Sneha', bookingUrl: 'https://x/y', variant })
      expect(html).toContain('reply to this email')
      expect(html).not.toContain('href=""')
      expect(html).toContain('Financial Conduct Authority')
    }
  })
})
