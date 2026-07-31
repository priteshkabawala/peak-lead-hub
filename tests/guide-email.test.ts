import { describe, it, expect } from 'vitest'
import { guideEmailHtml, variantForLead, type EmailVariant } from '@/lib/notify-lead'

// This email is the only thing every prospect definitely receives. Two variants
// are under test, so the invariants below must hold for BOTH — a bug that only
// affects one arm would quietly skew the result.

const CAL = 'https://crm.mypensionadvisor.co.uk/api/e/book?l=42'
const VARIANTS: EmailVariant[] = ['B', 'D']
const render = (v: EmailVariant, over: Record<string, unknown> = {}) =>
  guideEmailHtml({ firstName: 'Sneha', bookingUrl: CAL, variant: v, ...over })

describe('variant assignment', () => {
  it('splits evenly by lead id parity', () => {
    expect(variantForLead(42)).toBe('B')
    expect(variantForLead(43)).toBe('D')
  })

  // A resend must never show one person a different email.
  it('is stable for a given lead', () => {
    for (const id of [1, 2, 77, 512]) {
      expect(variantForLead(id)).toBe(variantForLead(id))
    }
  })

  it('stays balanced across a realistic run of leads', () => {
    const counts = { B: 0, D: 0 }
    for (let id = 1; id <= 200; id++) counts[variantForLead(id)]++
    expect(counts.B).toBe(100)
    expect(counts.D).toBe(100)
  })

  it('defaults to B when no variant is passed', () => {
    expect(guideEmailHtml({ firstName: 'Sneha', bookingUrl: CAL }))
      .toBe(render('B'))
  })
})

describe.each(VARIANTS)('variant %s — invariants', v => {
  const html = render(v)

  it('greets the lead by first name', () => {
    expect(html).toContain('Sneha')
  })

  it('handles a missing name without printing a stray comma or null', () => {
    for (const n of [null, '', '   ']) {
      const h = render(v, { firstName: n })
      expect(h).not.toContain('Hi ,')
      expect(h).not.toContain('undefined')
      expect(h).not.toContain('null')
    }
  })

  it('links the booking URL', () => {
    expect(html).toContain(`href="${CAL}"`)
  })

  // A dead link reads as a broken email, so each variant has a fallback.
  it('degrades without a dead link when no URL is configured', () => {
    const h = render(v, { bookingUrl: '' })
    expect(h).not.toContain('href=""')
    expect(h).not.toMatch(/href="\s*"/)
  })

  it('still offers a way to respond when there is no booking URL', () => {
    const h = render(v, { bookingUrl: '' })
    expect(h.toLowerCase()).toMatch(/repl(y|ies)|email me/)
  })

  it('carries the signature', () => {
    expect(html).toContain('Reece Hogan')
    expect(html).toContain('03302-235-034')
    expect(html).toContain('07877-651-518')
  })

  it('never leaks CRM branding to the prospect', () => {
    expect(html).not.toMatch(/peak/i)
    expect(html).not.toMatch(/lead hub/i)
  })

  it('identifies the sender by domain', () => {
    expect(html).toContain('mypensionadvisor.co.uk')
  })

  it('avoids flexbox and grid, which Outlook ignores', () => {
    expect(html).not.toMatch(/display:\s*(flex|grid)/)
  })

  it('styles inline rather than with a stylesheet or classes', () => {
    expect(html).not.toContain('<style')
    expect(html).not.toContain('class=')
  })

  it('leaves no unreplaced template placeholders', () => {
    expect(html).not.toMatch(/\{\{|\}\}|\$\{/)
  })

  it('says the call is free and unpressured', () => {
    expect(html.toLowerCase()).toMatch(/no cost|no obligation|nothing to sign/)
  })
})

describe('variant B — time-of-day buttons', () => {
  const html = render('B')

  it('offers all three times of day', () => {
    expect(html).toContain('Morning')
    expect(html).toContain('Afternoon')
    expect(html).toContain('Evening')
  })

  it('points every button at the booking link', () => {
    expect(html.match(new RegExp(CAL.replace(/[?]/g, '\\?'), 'g'))?.length).toBeGreaterThanOrEqual(3)
  })

  it('keeps the callback offer below the ask, so it cannot pre-empt booking', () => {
    expect(html.indexOf('When would suit you')).toBeLessThan(html.indexOf('Prefer us to call you'))
  })

  it('keeps the "email me" route', () => {
    expect(html).toContain('mailto:reece@mypensionadvisor.co.uk')
  })

  it('degrades buttons to plain text without a URL', () => {
    const h = render('B', { bookingUrl: '' })
    expect(h).toContain('Morning')
    expect(h).not.toContain('<a href=""')
  })
})

describe('variant D — personal note', () => {
  const html = render('D')

  it('reads as a letter, with no buttons', () => {
    expect(html).toContain('Here&rsquo;s my calendar')
    expect(html).not.toMatch(/background:#2563eb/)
  })

  it('uses a serif face, which is what makes it feel typed', () => {
    expect(html).toMatch(/font-family:Georgia/)
  })

  it('names the specific guide requested', () => {
    expect(render('D', { guideTitle: 'Combining Your Pension Pots' }))
      .toContain('Combining Your Pension Pots')
  })

  it('falls back to a generic guide name when none is passed', () => {
    expect(html).toContain('your pension guide')
  })

  it('invites a plain reply as well as a booking', () => {
    expect(html).toContain('reply to this email')
  })

  it('mentions evenings, which is the objection it answers', () => {
    expect(html).toContain('including evenings')
  })
})
