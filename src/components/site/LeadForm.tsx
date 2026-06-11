'use client'

import { useState } from 'react'
import { ADVICE_OPTIONS } from '@/lib/site'

type Variant = 'callback' | 'quick' | 'contact' | 'review'

const ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M5 13l4 4L19 7" />
  </svg>
)

export default function LeadForm({
  variant = 'callback',
  source,
  title,
  subtitle,
  buttonLabel = 'Request Callback',
}: {
  variant?: Variant
  source: string
  title?: string
  subtitle?: string
  buttonLabel?: string
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    const fd = new FormData(e.currentTarget)
    const payload = Object.fromEntries(fd.entries())
    payload.source = source

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setStatus('err')
        return
      }
      setStatus('ok')
      e.currentTarget.reset()
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStatus('err')
    }
  }

  if (status === 'ok') {
    return (
      <div className="mpa-formcard" role="status">
        <div style={{ textAlign: 'center', padding: '14px 0' }}>
          <div
            style={{
              width: 54, height: 54, borderRadius: '50%', background: '#e7f7ee',
              color: '#0a6b3b', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 style={{ marginBottom: 6 }}>Thank you!</h3>
          <p className="mpa-formsub">
            Your request has been received. One of our team will be in touch shortly to arrange your free,
            no-obligation consultation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form className="mpa-formcard" onSubmit={onSubmit} noValidate>
      {title && <h3>{title}</h3>}
      {subtitle && <p className="mpa-formsub">{subtitle}</p>}

      {status === 'err' && <div className="mpa-form-msg err">{error}</div>}

      {/* Honeypot — hidden from users, catches bots */}
      <input className="mpa-honey" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {variant === 'review' ? (
        <>
          <div className="mpa-row2">
            <div className="mpa-field">
              <label htmlFor="lf-first">First name</label>
              <input id="lf-first" className="mpa-input" name="first_name" required placeholder="Jane" />
            </div>
            <div className="mpa-field">
              <label htmlFor="lf-last">Last name</label>
              <input id="lf-last" className="mpa-input" name="last_name" placeholder="Doe" />
            </div>
          </div>
        </>
      ) : (
        <div className="mpa-field">
          <label htmlFor="lf-name">Name</label>
          <input id="lf-name" className="mpa-input" name="name" required placeholder="Your full name" />
        </div>
      )}

      {variant !== 'quick' && (
        <div className="mpa-field">
          <label htmlFor="lf-email">Email</label>
          <input id="lf-email" className="mpa-input" name="email" type="email" placeholder="you@example.com" />
        </div>
      )}

      <div className="mpa-field">
        <label htmlFor="lf-phone">Telephone number</label>
        <input id="lf-phone" className="mpa-input" name="phone" required placeholder="e.g. 07123 456789" />
      </div>

      {(variant === 'callback' || variant === 'review') && (
        <div className="mpa-field">
          <label htmlFor="lf-postcode">Postcode</label>
          <input id="lf-postcode" className="mpa-input" name="postcode" placeholder="e.g. W1 1AL" />
        </div>
      )}

      {(variant === 'callback' || variant === 'review') && (
        <div className="mpa-field">
          <label htmlFor="lf-advice">Type of advice needed</label>
          <select id="lf-advice" className="mpa-select" name="advice" defaultValue="">
            <option value="" disabled>
              Please select…
            </option>
            {ADVICE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      )}

      {(variant === 'contact' || variant === 'review') && (
        <div className="mpa-field">
          <label htmlFor="lf-message">Message</label>
          <textarea id="lf-message" className="mpa-textarea" name="message" placeholder="How can we help?" />
        </div>
      )}

      <button className="mpa-btn mpa-btn-gold mpa-btn-block" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : buttonLabel} {status !== 'sending' && ICON}
      </button>

      <p className="mpa-form-fine">
        By submitting, you agree to be contacted about your enquiry. Your data is held securely and never sold.
      </p>
    </form>
  )
}
