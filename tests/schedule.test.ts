import { describe, it, expect } from 'vitest'
import {
  todayISO, shiftToWorkingDay, addDaysWorking, firstCallDue,
  CADENCE_DAYS, MAX_ATTEMPTS,
} from '@/lib/schedule'

// The callback ladder is the heart of the caller's day: if a due date lands on
// a weekend or drifts by a day, the caller either works a Saturday or a
// paid-for lead goes cold. These are the rules Pritesh specified.

describe('todayISO', () => {
  it('reports the Europe/London date, not the server date', () => {
    // 23:30 UTC on 30 June is already 1 July in London (BST, UTC+1).
    expect(todayISO(new Date('2026-06-30T23:30:00Z'))).toBe('2026-07-01')
  })

  it('does not roll forward in winter, when London is UTC', () => {
    expect(todayISO(new Date('2026-01-30T23:30:00Z'))).toBe('2026-01-30')
  })

  it('formats as YYYY-MM-DD so dates compare as strings', () => {
    expect(todayISO(new Date('2026-03-05T12:00:00Z'))).toBe('2026-03-05')
  })
})

describe('shiftToWorkingDay', () => {
  it('moves Saturday to Monday', () => {
    expect(shiftToWorkingDay('2026-08-01')).toBe('2026-08-03') // Sat -> Mon
  })

  it('moves Sunday to Monday', () => {
    expect(shiftToWorkingDay('2026-08-02')).toBe('2026-08-03') // Sun -> Mon
  })

  it('leaves weekdays alone', () => {
    for (const d of ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']) {
      expect(shiftToWorkingDay(d)).toBe(d)
    }
  })

  it('carries across a month boundary', () => {
    expect(shiftToWorkingDay('2026-02-28')).toBe('2026-03-02') // Sat -> Mon
  })

  it('carries across a year boundary', () => {
    expect(shiftToWorkingDay('2027-01-02')).toBe('2027-01-04') // Sat -> Mon
  })
})

describe('addDaysWorking', () => {
  it('applies the 3-day cadence', () => {
    expect(addDaysWorking('2026-08-03', CADENCE_DAYS)).toBe('2026-08-06') // Mon -> Thu
  })

  it('skips the weekend when the cadence lands on it', () => {
    // Wed 29 Jul + 3 = Sat 1 Aug, which must become Mon 3 Aug.
    expect(addDaysWorking('2026-07-29', CADENCE_DAYS)).toBe('2026-08-03')
  })

  it('never returns a weekend, for any start day across a full year', () => {
    const d = new Date(Date.UTC(2026, 0, 1))
    for (let i = 0; i < 365; i++) {
      const iso = d.toISOString().slice(0, 10)
      const out = addDaysWorking(iso, CADENCE_DAYS)
      const dow = new Date(out + 'T00:00:00Z').getUTCDay()
      expect(dow, `${iso} + ${CADENCE_DAYS} gave ${out}`).not.toBe(0)
      expect(dow, `${iso} + ${CADENCE_DAYS} gave ${out}`).not.toBe(6)
      d.setUTCDate(d.getUTCDate() + 1)
    }
  })

  it('always moves forward, never backwards', () => {
    const d = new Date(Date.UTC(2026, 0, 1))
    for (let i = 0; i < 365; i++) {
      const iso = d.toISOString().slice(0, 10)
      expect(addDaysWorking(iso, CADENCE_DAYS) > iso).toBe(true)
      d.setUTCDate(d.getUTCDate() + 1)
    }
  })

  it('handles the +1 day used by the missed-meeting requeue', () => {
    expect(addDaysWorking('2026-08-07', 1)).toBe('2026-08-10') // Fri +1 -> Mon
  })
})

describe('firstCallDue', () => {
  it('calls a midweek lead the same day', () => {
    expect(firstCallDue('2026-07-29')).toBe('2026-07-29') // Wed
  })

  it('pushes a Friday lead to Monday, so attempt 2 misses the weekend', () => {
    expect(firstCallDue('2026-07-31')).toBe('2026-08-03') // Fri -> Mon
  })

  it('pushes a weekend lead to Monday', () => {
    expect(firstCallDue('2026-08-01')).toBe('2026-08-03') // Sat
    expect(firstCallDue('2026-08-02')).toBe('2026-08-03') // Sun
  })

  it('never returns a weekend, for any intake day across a full year', () => {
    const d = new Date(Date.UTC(2026, 0, 1))
    for (let i = 0; i < 365; i++) {
      const out = firstCallDue(d.toISOString().slice(0, 10))
      const dow = new Date(out + 'T00:00:00Z').getUTCDay()
      expect(dow).not.toBe(0)
      expect(dow).not.toBe(6)
      d.setUTCDate(d.getUTCDate() + 1)
    }
  })
})

describe('the four-attempt ladder', () => {
  // Mon +3 = Thu; Thu +3 = Sun, which becomes Mon; so the ladder settles into
  // a Mon/Thu rhythm rather than drifting into the weekend.
  it('runs a Monday lead Mon → Thu → Mon → Thu, all working days', () => {
    // Mirrors advanceSchedule's date maths, which is what the caller sees.
    const ladder: string[] = []
    let day = firstCallDue('2026-08-03') // Mon 3 Aug
    ladder.push(day)
    for (let attempt = 2; attempt <= MAX_ATTEMPTS; attempt++) {
      day = addDaysWorking(day, CADENCE_DAYS)
      ladder.push(day)
    }
    expect(ladder).toEqual(['2026-08-03', '2026-08-06', '2026-08-10', '2026-08-13'])
    for (const d of ladder) {
      const dow = new Date(d + 'T00:00:00Z').getUTCDay()
      expect(dow).not.toBe(0)
      expect(dow).not.toBe(6)
    }
  })

  it('gives four attempts, matching the agreed process', () => {
    expect(MAX_ATTEMPTS).toBe(4)
    expect(CADENCE_DAYS).toBe(3)
  })
})
