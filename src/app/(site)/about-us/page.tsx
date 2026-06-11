import type { Metadata } from 'next'
import { PageHero, CtaBand } from '@/components/site/PageBits'

export const metadata: Metadata = { title: 'About Us' }

const VALUES = [
  ['Integrity', 'We act in your best interests and explain everything clearly, with no hidden fees.'],
  ['Customer focused', 'We take the time to understand your goals and match you with the right specialist.'],
  ['Trust', 'We’re ICO registered and only introduce you to FCA-regulated advisers.'],
  ['Experience', 'Years of helping people make confident decisions about their retirement.'],
]

export default function AboutPage() {
  return (
    <>
      <PageHero title="About us" />
      <section className="mpa-section">
        <div className="mpa-wrap mpa-split">
          <div className="mpa-prose">
            <div className="mpa-eyebrow">Who we are</div>
            <h2 style={{ fontSize: 30, marginBottom: 14 }}>We’re here to perfectly connect you</h2>
            <p>
              My Pension Advisor was created to take the stress out of finding trustworthy pension and financial
              advice. We’re not advisers ourselves — instead, we connect you, free of charge, with FCA-regulated
              financial advisers who specialise in exactly the kind of help you need.
            </p>
            <p>
              Whether you want to review an existing pension, track down old workplace pots, consolidate your
              savings or plan a comfortable retirement, we’ll match you with a regulated specialist and make the
              whole process simple and clear.
            </p>
            <p>
              We are registered with the ICO, ensuring your data is held securely at every step, and we’ll deal with
              your enquiry until you’re completely happy.
            </p>
          </div>
          <div className="mpa-grid mpa-grid-2">
            {VALUES.map(([t, b]) => (
              <div className="mpa-card" key={t}>
                <h3 style={{ fontSize: 18 }}>{t}</h3>
                <p>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  )
}
