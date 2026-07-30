import { describe, it, expect } from 'vitest'
import { guideEmailHtml } from '@/lib/notify-lead'

// This email is the only thing every prospect definitely receives, so the copy
// and the booking link are pinned here.

const CAL = 'https://calendly.com/pritesh-kabawala-wealthplanner'

describe('greeting', () => {
  it('uses the first name when LinkedIn gave us one', () => {
    expect(guideEmailHtml({ firstName: 'Sneha', bookingUrl: CAL })).toContain('Hi Sneha, Thank you for requesting our Guide!')
  })

  it('falls back to a plain greeting when there is no name', () => {
    for (const n of [null, '', '   ']) {
      const html = guideEmailHtml({ firstName: n, bookingUrl: CAL })
      expect(html).toContain('Hi. Thank you for requesting our Guide!')
      expect(html).not.toContain('Hi ,')
      expect(html).not.toContain('undefined')
      expect(html).not.toContain('null')
    }
  })

  it('trims a padded name rather than printing the padding', () => {
    expect(guideEmailHtml({ firstName: '  Sneha  ', bookingUrl: CAL })).toContain('Hi Sneha,')
  })
})

describe('copy', () => {
  const html = guideEmailHtml({ firstName: 'Sneha', bookingUrl: CAL })

  it.each([
    'Our representative may contact you shortly',
    'Pension planning, including investing and estate planning.',
    'Finding an adviser who puts you first.',
    'Aligning your investments and retirement goals.',
    'Are you prepared to discover how we can assist you in achieving a comfortable retirement?',
    'schedule an in-depth meeting with your qualified professional',
    'Is your portfolio positioned to meet your goals?',
    'Will you have enough throughout retirement?',
    'How can you generate income to maintain your lifestyle?',
    'Kind Regards',
  ])('includes %s', line => {
    expect(html).toContain(line)
  })

  it('carries the signature block', () => {
    expect(html).toContain('Reece Hogan')
    expect(html).toContain('03302-235-034')
    expect(html).toContain('07877-651-518')
    expect(html).toContain('85 Great Portland St')
  })

  it('no longer contains the copy this replaced', () => {
    expect(html).not.toContain('One of our advisers may reach out')
    expect(html).not.toContain('genuinely useful')
  })

  // The prospect knows the business as My Pension Advisor, from the campaign
  // and the domain. The CRM's own branding must not leak into their inbox.
  it('does not mention Peak Personal Finance or the CRM', () => {
    expect(html).not.toMatch(/peak/i)
    expect(html).not.toMatch(/lead hub/i)
  })

  it('still identifies the sender by domain', () => {
    expect(html).toContain('mypensionadvisor.co.uk')
  })
})

describe('the booking link', () => {
  it('links "click here" and shows a button when a URL is configured', () => {
    const html = guideEmailHtml({ firstName: 'Sneha', bookingUrl: CAL })
    expect(html).toContain(`<a href="${CAL}"`)
    expect(html).toContain('>click here</a>')
    expect(html).toContain('Book your meeting')
  })

  // A "click here" that goes nowhere reads as a broken email.
  it('degrades to plain text when no URL is configured', () => {
    const html = guideEmailHtml({ firstName: 'Sneha', bookingUrl: '' })
    expect(html).toContain('click here')
    expect(html).not.toContain('>click here</a>')
    expect(html).not.toContain('Book your meeting')
    expect(html).not.toContain('href=""')
  })

  it('always offers an email route, since the copy says "Email me"', () => {
    for (const url of [CAL, '']) {
      expect(guideEmailHtml({ firstName: 'Sneha', bookingUrl: url })).toMatch(/<a href="mailto:[^"]+"/)
    }
  })

  // "Email me" is signed by Reece, so it must reach Reece — and it has to be
  // right even when LEAD_EMAIL_REPLY_TO is unset, which is how it shipped
  // pointing at a placeholder inbox.
  // The signature block is read once at import, so this asserts the compiled-in
  // default that applies when LEAD_EMAIL_REPLY_TO is absent.
  it('points "Email me" at Reece by default', () => {
    const html = guideEmailHtml({ firstName: 'Sneha', bookingUrl: CAL })
    expect(html).toContain('mailto:reece@mypensionadvisor.co.uk')
    expect(html).not.toContain('info@mypensionadvisor.co.uk')
  })
})

describe('email-client safety', () => {
  const html = guideEmailHtml({ firstName: 'Sneha', bookingUrl: CAL })

  // Outlook ignores these, which would collapse the layout.
  it('avoids flexbox and grid', () => {
    expect(html).not.toMatch(/display:\s*(flex|grid)/)
  })

  it('styles inline rather than with a stylesheet or classes', () => {
    expect(html).not.toContain('<style')
    expect(html).not.toContain('class=')
  })

  it('leaves no unreplaced template placeholders', () => {
    expect(html).not.toMatch(/\{\{|\}\}|\$\{/)
  })
})
