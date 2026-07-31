'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { CAREER_STAGES, PRIORITIES, RISK_PROFILES } from '../content'
import { gbpExact } from '../engine'
import { submitEnquiry } from '../integrations/providers'
import { useGuide } from '../store'
import Icon from '../ui/Icon'
import { Btn } from '../ui/Primitives'

/** Builds the adviser-facing summary that travels with the enquiry. The user
 *  can read exactly what is sent before they send it. */
function buildSummary(g: ReturnType<typeof useGuide>): string {
  const { state, scores, projection, riskProfile } = g
  const l = state.lifestyle
  const stage = CAREER_STAGES.find((s) => s.id === state.careerStage)?.label ?? 'Not stated'
  const priorities = state.priorities.map((p) => PRIORITIES.find((x) => x.id === p)?.label).filter(Boolean)
  return [
    `Elite wealth guide summary`,
    `Career stage: ${stage} (${l.discipline}), age ${l.age}, ~${l.yearsOfEarning} earning years left`,
    `Income: ${gbpExact(l.annualIncome)}/yr gross · Spending: ${gbpExact(l.monthlySpend)}/mo`,
    `Investable: ${gbpExact(l.investableAssets)} · Pension: ${gbpExact(l.pensionPot)} · Property: ${gbpExact(
      l.propertyValue,
    )} · Debt: ${gbpExact(l.debt)}`,
    `Protection in place: ${l.hasProtection ? 'yes' : 'no'} · Cash buffer: ${l.emergencyMonths} months · Dependants: ${l.dependants}`,
    `Investor profile: ${RISK_PROFILES[riskProfile].label}`,
    `Peak score: ${scores.peakScore}/100 (retirement ${scores.retirementReadiness}, investing ${scores.investmentReadiness}, diversification ${scores.diversification}, resilience ${scores.resilience}, protection ${scores.wealthProtection}, planning ${scores.longTermPlanning})`,
    `Projection: wealth ${projection.depletionAge ? `exhausted at age ${projection.depletionAge}` : 'lasts the full horizon'}; sustainable spend ${gbpExact(projection.sustainableSpend)}/yr`,
    priorities.length ? `Priorities: ${priorities.join(' > ')}` : '',
    state.concerns.length ? `Concerns: ${state.concerns.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export default function ConnectPanel() {
  const guide = useGuide()
  const [open, setOpen] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const summary = buildSummary(guide)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      await submitEnquiry({
        name: form.name,
        phone: form.phone,
        email: form.email,
        company: form.company, // honeypot — must stay empty
        message: summary,
      })
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div
      className="pk-card-solid overflow-hidden"
      style={{
        background:
          'linear-gradient(150deg, color-mix(in srgb, var(--pk-gold) 12%, var(--pk-surface-solid)), var(--pk-surface-solid) 62%)',
      }}
    >
      <div className="p-6 sm:p-8">
        <p className="pk-eyebrow">Optional</p>
        <h2 className="mt-2 text-[26px] sm:text-[32px]">Want someone to pressure-test this?</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
          Everything above is educational, not advice. If you would like an FCA-regulated adviser who works with
          athletes and public figures to review it with you, we can arrange a no-obligation conversation. Nothing is
          sent until you press the button.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {!open && status !== 'sent' ? (
            <Btn onClick={() => setOpen(true)} icon="arrow">
              Arrange a private review
            </Btn>
          ) : null}
          <Btn variant="ghost" icon="check" iconSide="left" onClick={() => window.print()}>
            Save or print my roadmap
          </Btn>
        </div>

        <AnimatePresence>
          {open && status !== 'sent' ? (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={submit}
              className="overflow-hidden"
            >
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                <Field
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  required
                />
                <Field label="Email (optional)" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              </div>

              {/* Honeypot — hidden from people, irresistible to bots */}
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="absolute h-0 w-0 opacity-0"
                aria-hidden="true"
              />

              <button
                type="button"
                onClick={() => setShowSummary((s) => !s)}
                className="mt-4 inline-flex items-center gap-2 text-[13px] underline underline-offset-4"
                style={{ color: 'var(--pk-muted)' }}
              >
                <Icon name="info" size={14} />
                {showSummary ? 'Hide' : 'See'} exactly what gets sent
              </button>

              <AnimatePresence>
                {showSummary ? (
                  <motion.pre
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl p-4 text-[12px] leading-relaxed"
                    style={{ background: 'var(--pk-surface-2)', color: 'var(--pk-text-2)' }}
                  >
                    {summary}
                  </motion.pre>
                ) : null}
              </AnimatePresence>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Btn type="submit" disabled={status === 'sending'} icon="arrow">
                  {status === 'sending' ? 'Sending…' : 'Request a callback'}
                </Btn>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[13.5px]"
                  style={{ color: 'var(--pk-muted)' }}
                >
                  Not now
                </button>
              </div>

              {status === 'error' ? (
                <p className="mt-3 text-[13.5px]" style={{ color: 'var(--pk-rose)' }}>
                  {error}
                </p>
              ) : null}

              <p className="mt-4 text-[12px] leading-relaxed" style={{ color: 'var(--pk-muted)' }}>
                By requesting a callback you agree to be contacted about financial advice. Your figures are shared with
                the adviser so they do not have to ask you again. No product is sold on this page.
              </p>
            </motion.form>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {status === 'sent' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-start gap-3 rounded-2xl p-4"
              style={{
                background: 'color-mix(in srgb, var(--pk-mint) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--pk-mint) 30%, transparent)',
              }}
            >
              <span style={{ color: 'var(--pk-mint)' }} className="mt-0.5">
                <Icon name="check" size={18} />
              </span>
              <div>
                <p className="font-semibold">Request received</p>
                <p className="mt-1 text-[14px]" style={{ color: 'var(--pk-text-2)' }}>
                  An adviser will be in touch. Your roadmap stays available in this browser — come back and adjust the
                  figures whenever your situation changes.
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="pk-hairline" />
      <p className="p-6 text-[11.5px] leading-relaxed sm:px-8" style={{ color: 'var(--pk-muted)' }}>
        This guide provides information, not financial advice. Projections are illustrative, use simplified UK tax
        assumptions and are not a reliable indicator of future performance. Investments can fall as well as rise, and
        you may get back less than you invest. Tax treatment depends on individual circumstances and may change.
        Pensions are normally inaccessible until age 55, rising to 57 in 2028. Always take regulated advice before
        acting.
      </p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold" style={{ color: 'var(--pk-text-2)' }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3.5 py-3 text-[15px] outline-none transition-colors"
        style={{
          background: 'var(--pk-surface-2)',
          border: '1px solid var(--pk-line)',
          color: 'var(--pk-text)',
        }}
      />
    </label>
  )
}
