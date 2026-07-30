import { describe, it, expect } from 'vitest'
import { toE164UK, explainMetaCode } from '@/lib/whatsapp'

describe('toE164UK', () => {
  it.each([
    ['07877651518', '+447877651518'],
    ['07877 651518', '+447877651518'],
    ['07877-651-518', '+447877651518'],
    ['+44 7877 651518', '+447877651518'],
    ['0044 7877 651518', '+447877651518'],
    ['44 7877 651518', '+447877651518'],
  ])('converts %s', (input, expected) => {
    expect(toE164UK(input)).toBe(expected)
  })

  it('rejects what it cannot convert', () => {
    for (const bad of ['', '123', 'not a phone', '+61403672555']) {
      expect(toE164UK(bad)).toBeNull()
    }
  })

  it('is stable when run on its own output', () => {
    const once = toE164UK('07877651518')!
    expect(toE164UK(once)).toBe(once)
  })
})

// When Meta fails, it returns a bare number. These mappings are what turn that
// into something actionable, so each must name the actual fix.
describe('explainMetaCode', () => {
  it.each([
    [190, /token/i],
    [131030, /allow-list/i],
    [133010, /not registered/i],
    [133005, /two-step|pin/i],
    [132000, /variable count/i],
    [132001, /name or language/i],
    [132015, /paused|disabled/i],
    [200, /permission/i],
    [10, /permission/i],
  ])('explains %i', (code, pattern) => {
    expect(explainMetaCode(code)).toMatch(pattern)
  })

  it('returns null for codes it does not know, rather than guessing', () => {
    expect(explainMetaCode(999999)).toBeNull()
    expect(explainMetaCode(undefined)).toBeNull()
  })

  it('covers the errors this integration actually hit', () => {
    // 131030 and 190 are the two that blocked us before; regressions here would
    // put us back to guessing.
    expect(explainMetaCode(131030)).toBeTruthy()
    expect(explainMetaCode(190)).toBeTruthy()
  })
})
