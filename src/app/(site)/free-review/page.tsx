import type { Metadata } from 'next'
import { PageHero } from '@/components/site/PageBits'
import LeadForm from '@/components/site/LeadForm'

export const metadata: Metadata = { title: 'Free Review' }

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0170b9" strokeWidth="2.6">
    <path d="M5 13l4 4L19 7" />
  </svg>
)

export default function FreeReviewPage() {
  return (
    <>
      <PageHero title="Free Review" />
      <section className="mpa-section">
        <div className="mpa-wrap mpa-split">
          <div>
            <div className="mpa-eyebrow">How can we help?</div>
            <h2 style={{ fontSize: 30, marginBottom: 14 }}>Book your free, no-obligation review</h2>
            <p className="mpa-lead" style={{ marginBottom: 24 }}>
              Fill out the form and we’ll be in touch as soon as possible to arrange your free consultation with an
              FCA-regulated adviser.
            </p>
            <ul className="mpa-hero-points" style={{ color: 'var(--mpa-ink)' }}>
              <li style={{ color: 'var(--mpa-ink)' }}><Check /> No hidden fees — the introduction is free</li>
              <li style={{ color: 'var(--mpa-ink)' }}><Check /> Matched to a specialist for your needs</li>
              <li style={{ color: 'var(--mpa-ink)' }}><Check /> No obligation to proceed</li>
              <li style={{ color: 'var(--mpa-ink)' }}><Check /> ICO registered — your data stays secure</li>
            </ul>
          </div>
          <div>
            <LeadForm
              variant="review"
              source="Free Review"
              title="Request your free review"
              subtitle="Tell us a little about yourself and what you need."
              buttonLabel="Request my free review"
            />
          </div>
        </div>
      </section>
    </>
  )
}
