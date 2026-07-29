import { describe, it, expect, afterEach, vi } from 'vitest'
import { checkPhone, carrierLookup, verifyPhone } from '@/lib/phone'

// Every lead is paid for, so this is a two-sided cost: letting a dud through
// wastes the caller's time, parking a good number wastes the lead. The numbers
// below are the real shapes seen in the CRM.

describe('checkPhone — accepts genuine UK mobiles', () => {
  const good = [
    ['07722616216', '+447722616216'],
    ['+44 7877 651518', '+447877651518'],
    ['07789 981422', '+447789981422'],
    ['+447967680305', '+447967680305'],
    ['0044 7833 046678', '+447833046678'],
  ] as const

  it.each(good)('accepts %s', (input, e164) => {
    const v = checkPhone(input)
    expect(v.ok, v.reason ?? '').toBe(true)
    expect(v.e164).toBe(e164)
    expect(v.reason).toBeNull()
  })

  it('normalises to E.164 regardless of spacing or prefix', () => {
    const forms = ['07722616216', '07722 616216', '+44 7722 616216', '0044 7722 616216', ' 07722-616216 ']
    for (const f of forms) expect(checkPhone(f).e164).toBe('+447722616216')
  })
})

describe('checkPhone — parks what the old regex let through', () => {
  // These two are the regressions that made the rewrite necessary: both were
  // accepted by the previous regex and reached the caller.
  it('parks a placeholder number', () => {
    const v = checkPhone('07342000000')
    expect(v.ok).toBe(false)
    expect(v.reason).toMatch(/placeholder/i)
  })

  it('parks a landline', () => {
    const v = checkPhone('01772732176')
    expect(v.ok).toBe(false)
    expect(v.reason).toMatch(/landline/i)
  })
})

describe('checkPhone — parks the rest', () => {
  const bad: [string, string, RegExp][] = [
    ['an Australian mobile', '+61 403 672 555', /not a uk number \(au\)/i],
    ['a Venezuelan number', '+58 414 6088928', /not a uk number \(ve\)/i],
    ['a too-short number', '+44 7715 81317', /not a valid number/i],
    ['a landline in another area', '+44 1464851125', /landline/i],
    ['an empty string', '', /no phone number/i],
    ['whitespace only', '   ', /no phone number/i],
    ['obvious junk', 'not a phone', /not a (usable|valid)/i],
  ]

  it.each(bad)('parks %s', (_label, input, reason) => {
    const v = checkPhone(input)
    expect(v.ok).toBe(false)
    expect(v.reason).toMatch(reason)
  })

  it('always gives the admin a reason when it parks a number', () => {
    for (const [, input] of bad) {
      expect(checkPhone(input).reason, `no reason for ${input}`).toBeTruthy()
    }
  })

  it('handles null and undefined without throwing', () => {
    expect(checkPhone(null).ok).toBe(false)
    expect(checkPhone(undefined).ok).toBe(false)
  })
})

describe('carrierLookup — the optional paid layer', () => {
  const env = { ...process.env }
  afterEach(() => { process.env = { ...env }; vi.unstubAllGlobals() })

  it('is skipped unless the provider is configured', async () => {
    delete process.env.PHONE_LOOKUP_PROVIDER
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect(await carrierLookup('+447722616216')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('is skipped when the provider is set but credentials are missing', async () => {
    process.env.PHONE_LOOKUP_PROVIDER = 'twilio'
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    expect(await carrierLookup('+447722616216')).toBeNull()
  })

  function twilio(body: unknown, ok = true) {
    process.env.PHONE_LOOKUP_PROVIDER = 'twilio'
    process.env.TWILIO_ACCOUNT_SID = 'AC_test'
    process.env.TWILIO_AUTH_TOKEN = 'tok_test'
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body })))
  }

  it('rejects a number the carrier says is not in service', async () => {
    twilio({ valid: false })
    const v = await carrierLookup('+447722616216')
    expect(v?.ok).toBe(false)
    expect(v?.reason).toMatch(/not in service/i)
  })

  it('rejects a landline the carrier identifies', async () => {
    twilio({ valid: true, line_type_intelligence: { type: 'landline' } })
    const v = await carrierLookup('+447722616216')
    expect(v?.ok).toBe(false)
    expect(v?.reason).toMatch(/landline.*not a mobile/i)
  })

  it('accepts a confirmed mobile', async () => {
    twilio({ valid: true, line_type_intelligence: { type: 'mobile' } })
    expect((await carrierLookup('+447722616216'))?.ok).toBe(true)
  })

  // Intake must never stall because a paid third party is down.
  it('fails open when the lookup errors', async () => {
    twilio({ status: 500 }, false)
    expect(await carrierLookup('+447722616216')).toBeNull()
  })

  it('fails open when the network throws', async () => {
    process.env.PHONE_LOOKUP_PROVIDER = 'twilio'
    process.env.TWILIO_ACCOUNT_SID = 'AC_test'
    process.env.TWILIO_AUTH_TOKEN = 'tok_test'
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET') }))
    expect(await carrierLookup('+447722616216')).toBeNull()
  })
})

describe('verifyPhone', () => {
  const env = { ...process.env }
  afterEach(() => { process.env = { ...env }; vi.unstubAllGlobals() })

  it('does not pay for a lookup on a number already rejected offline', async () => {
    process.env.PHONE_LOOKUP_PROVIDER = 'twilio'
    process.env.TWILIO_ACCOUNT_SID = 'AC_test'
    process.env.TWILIO_AUTH_TOKEN = 'tok_test'
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const v = await verifyPhone('01772732176') // landline, caught in layer 1
    expect(v.ok).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the offline verdict when no provider is configured', async () => {
    delete process.env.PHONE_LOOKUP_PROVIDER
    const v = await verifyPhone('07722616216')
    expect(v.ok).toBe(true)
    expect(v.e164).toBe('+447722616216')
  })

  it('lets the carrier overrule an offline pass', async () => {
    process.env.PHONE_LOOKUP_PROVIDER = 'twilio'
    process.env.TWILIO_ACCOUNT_SID = 'AC_test'
    process.env.TWILIO_AUTH_TOKEN = 'tok_test'
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ valid: false }) })))
    expect((await verifyPhone('07722616216')).ok).toBe(false)
  })
})
