import type { Metadata } from 'next'
import { PageHero } from '@/components/site/PageBits'
import LeadForm from '@/components/site/LeadForm'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Contact Us' }

function Info({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li>
      <span className="mpa-ic">{icon}</span>
      <span>
        <b>{label}</b>
        {children}
      </span>
    </li>
  )
}

export default function ContactPage() {
  return (
    <>
      <PageHero title="Contact Us" />
      <section className="mpa-section">
        <div className="mpa-wrap mpa-split">
          <div>
            <div className="mpa-eyebrow">Talk to us today</div>
            <h2 style={{ fontSize: 28, marginBottom: 14 }}>We’re here to help</h2>
            <p className="mpa-lead" style={{ marginBottom: 28 }}>
              Have a question or want to arrange your free, no-obligation consultation? Send us a message or call
              us — we’re available Monday to Friday.
            </p>
            <ul className="mpa-infolist">
              <Info
                label="Email us"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                }
              >
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </Info>
              <Info
                label="Call us"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
                  </svg>
                }
              >
                <a href={SITE.phoneHref}>{SITE.phone}</a>
                <br />
                <a href={SITE.mobileHref}>{SITE.mobile}</a>
              </Info>
              <Info
                label="Opening hours"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                }
              >
                {SITE.hours}
              </Info>
            </ul>
          </div>
          <div>
            <LeadForm
              variant="contact"
              source="Contact — Send a message"
              title="Send us a message"
              subtitle="Fill out the form and we’ll be in touch as soon as possible."
              buttonLabel="Send message"
            />
          </div>
        </div>
      </section>
    </>
  )
}
