import { describe, it, expect } from 'vitest'
import { CALL_OUTCOMES, outcomeMeta } from '@/lib/supabase'

// These are the rules the CRM enforces on the caller's behalf. Several exist
// for compliance or because a lead was paid for, so they are asserted directly
// rather than left to code review.

describe('outcome catalogue', () => {
  it('has a unique value per outcome', () => {
    const values = CALL_OUTCOMES.map(o => o.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('gives every outcome a label and a resulting lead status', () => {
    for (const o of CALL_OUTCOMES) {
      expect(o.label, o.value).toBeTruthy()
      expect(o.status, o.value).toBeTruthy()
    }
  })

  it('looks up by value and returns undefined for anything unknown', () => {
    expect(outcomeMeta('no_answer')?.label).toBe('No answer')
    expect(outcomeMeta('nonsense')).toBeUndefined()
  })
})

describe('what keeps a lead on the schedule', () => {
  it('keeps trying after a call that did not connect', () => {
    for (const v of ['no_answer', 'voicemail', 'call_back']) {
      expect(outcomeMeta(v)?.schedule, v).toBe('continue')
    }
  })

  it('takes the lead off the schedule once it is resolved', () => {
    for (const v of ['connected', 'meeting_booked', 'not_interested', 'do_not_call', 'wrong_number']) {
      expect(outcomeMeta(v)?.schedule, v).toBe('stop')
    }
  })

  it('only asks for a date on the outcome that needs one', () => {
    const asks = CALL_OUTCOMES.filter(o => o.askDate).map(o => o.value)
    expect(asks).toEqual(['call_back'])
  })
})

describe('one-way doors are confirmed before they close', () => {
  it('confirms every outcome that ends the lead badly', () => {
    for (const v of ['not_interested', 'do_not_call', 'wrong_number']) {
      expect(outcomeMeta(v)?.confirm, v).toBe(true)
    }
  })

  it('does not nag on the everyday outcomes', () => {
    for (const v of ['no_answer', 'voicemail', 'call_back', 'connected', 'meeting_booked']) {
      expect(outcomeMeta(v)?.confirm, v).toBeFalsy()
    }
  })
})

describe('what reaches the admin', () => {
  it('asks the admin for a final try on a lead that said no — it was paid for', () => {
    expect(outcomeMeta('not_interested')?.adminAlert).toBe('final_try')
  })

  it('sends a do-not-call to the admin to decide, never to try again', () => {
    // Contacting someone who asked not to be contacted is the one mistake this
    // system must not make. 'decide' must never be treated as 'final_try'.
    const meta = outcomeMeta('do_not_call')
    expect(meta?.adminAlert).toBe('decide')
    expect(meta?.adminAlert).not.toBe('final_try')
    expect(meta?.schedule).toBe('stop')
  })

  it('parks a bad number so the admin can chase a better one', () => {
    const meta = outcomeMeta('wrong_number')
    expect(meta?.adminAlert).toBe('park')
    expect(meta?.status).toBe('Invalid Phone')
  })

  it('does not alert the admin about a good outcome', () => {
    for (const v of ['connected', 'meeting_booked', 'no_answer', 'voicemail', 'call_back']) {
      expect(outcomeMeta(v)?.adminAlert, v).toBeFalsy()
    }
  })
})

describe('resulting lead status', () => {
  it('marks a booked meeting so it leaves the call queue', () => {
    expect(outcomeMeta('meeting_booked')?.status).toBe('Meeting Booked')
  })

  it('marks interest as Qualified', () => {
    expect(outcomeMeta('connected')?.status).toBe('Qualified')
  })

  it('marks both refusals Cold', () => {
    expect(outcomeMeta('not_interested')?.status).toBe('Cold')
    expect(outcomeMeta('do_not_call')?.status).toBe('Cold')
  })

  it('leaves an unanswered lead Contacted, still in play', () => {
    for (const v of ['no_answer', 'voicemail', 'call_back']) {
      expect(outcomeMeta(v)?.status, v).toBe('Contacted')
    }
  })
})
