import Link from 'next/link'
import LeadForm from '@/components/site/LeadForm'
import { WHY_US, EXPERTISE, FEATURED_IN, TESTIMONIALS } from '@/lib/site'

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0a500" strokeWidth="2.6">
    <path d="M5 13l4 4L19 7" />
  </svg>
)

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mpa-hero">
        <div className="mpa-wrap mpa-hero-grid">
          <div>
            <h1>Looking for a stress-free pension service?</h1>
            <p>
              We connect you — free of charge — with FCA-regulated financial advisers to review, consolidate and
              grow your pension so you can retire with confidence.
            </p>
            <ul className="mpa-hero-points">
              <li><Check /> Free, no-obligation consultation</li>
              <li><Check /> Matched to a regulated, specialist adviser</li>
              <li><Check /> Your data held securely — we’re ICO registered</li>
            </ul>
            <Link href="/free-review" className="mpa-btn mpa-btn-gold">
              Book a Free Review
            </Link>
          </div>
          <div>
            <LeadForm
              variant="callback"
              source="Home — Request Callback"
              title="Get expert pension advice"
              subtitle="Fill in your details and we’ll call you back."
            />
          </div>
        </div>
      </section>

      {/* Featured in */}
      <section className="mpa-featured">
        <div className="mpa-wrap mpa-featured-row">
          <span className="mpa-featured-label">As featured in</span>
          {FEATURED_IN.map((name) => (
            <span className="mpa-featured-name" key={name}>
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Why use us */}
      <section className="mpa-section">
        <div className="mpa-wrap">
          <div className="mpa-center" style={{ marginBottom: 44, maxWidth: 720 }}>
            <div className="mpa-eyebrow">Why My Pension Advisor</div>
            <h2 className="mpa-h2">Advice you can trust, with no hidden fees</h2>
          </div>
          <div className="mpa-grid mpa-grid-3">
            {WHY_US.map((w) => (
              <div className="mpa-card" key={w.title}>
                <div className="mpa-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <h3>{w.title}</h3>
                <p>{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Areas of expertise */}
      <section className="mpa-section mpa-section-soft">
        <div className="mpa-wrap">
          <div className="mpa-center" style={{ marginBottom: 44, maxWidth: 720 }}>
            <div className="mpa-eyebrow">What we help with</div>
            <h2 className="mpa-h2">Areas of expertise</h2>
            <p className="mpa-lead mpa-center">
              Whatever your financial goal, we’ll connect you with a regulated specialist who can help.
            </p>
          </div>
          <div className="mpa-grid mpa-grid-3">
            {EXPERTISE.map((e) => (
              <div className="mpa-card" key={e.title}>
                <h3>{e.title}</h3>
                <p>{e.body}</p>
                <Link href={e.href} className="mpa-link-more">
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="mpa-section">
        <div className="mpa-wrap mpa-split">
          <div>
            <div className="mpa-eyebrow">Our promise to you</div>
            <h2 className="mpa-h2">Guarantee: we’ll deal with your enquiry until you’re happy</h2>
            <p className="mpa-lead">
              Come back at any time for further help from our experienced in-house team, or to query any aspect of
              your financial advice experience. We’re here to help every step of the way.
            </p>
            <div style={{ marginTop: 24 }}>
              <Link href="/contact-us" className="mpa-btn mpa-btn-blue">
                Talk to us today
              </Link>
            </div>
          </div>
          <div className="mpa-grid" style={{ gap: 16 }}>
            {[
              ['1', 'Tell us what you need', 'Share a few details about your pension and the help you’re looking for.'],
              ['2', 'We match you to an adviser', 'You’re introduced to an FCA-regulated specialist suited to your needs.'],
              ['3', 'Get clear, unbiased advice', 'Discuss your options in a free, no-obligation call and decide what’s right for you.'],
            ].map(([n, t, b]) => (
              <div className="mpa-card" key={n} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 38, height: 38, flex: 'none', borderRadius: '50%', background: '#0170b9',
                    color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {n}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, marginBottom: 4 }}>{t}</h3>
                  <p>{b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mpa-section mpa-section-soft">
        <div className="mpa-wrap">
          <div className="mpa-center" style={{ marginBottom: 44 }}>
            <div className="mpa-eyebrow">Our clients’ feedback</div>
            <h2 className="mpa-h2">Rated excellent by people just like you</h2>
          </div>
          <div className="mpa-grid mpa-grid-3">
            {TESTIMONIALS.map((t, i) => (
              <div className="mpa-quote" key={i}>
                <div className="mpa-stars">★★★★★</div>
                <p>“{t.quote}”</p>
                <div className="mpa-author">— {t.author}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mpa-section">
        <div className="mpa-wrap">
          <div className="mpa-ctaband">
            <h2>Get expert pension advice</h2>
            <p>We’ll connect you free of charge to the best financial adviser to help you plan your retirement.</p>
            <Link href="/free-review" className="mpa-btn mpa-btn-gold">
              Book Your Free Review
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
