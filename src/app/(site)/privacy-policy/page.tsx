import type { Metadata } from 'next'
import { PageHero } from '@/components/site/PageBits'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Privacy Policy" />
      <section className="mpa-section">
        <div className="mpa-wrap mpa-prose">
          <p>
            This privacy policy explains how My Pension Advisor collects, uses and protects the personal
            information you provide through this website. We are registered with the Information Commissioner’s
            Office (ICO) and are committed to keeping your data secure.
          </p>

          <h2>Information we collect</h2>
          <p>
            When you complete one of our enquiry or callback forms, we collect the details you provide — typically
            your name, email address, telephone number, postcode and the type of advice you’re interested in.
          </p>

          <h2>How we use your information</h2>
          <ul>
            <li>To contact you about your enquiry and arrange a consultation</li>
            <li>To introduce you to an appropriate FCA-regulated financial adviser</li>
            <li>To improve our service and respond to your questions</li>
          </ul>
          <p>
            We will only use your information for the purpose of handling your enquiry. We do not sell your personal
            data to third parties.
          </p>

          <h2>Sharing your information</h2>
          <p>
            With your consent, we share your details with regulated financial advisers so they can provide the
            advice you’ve requested. We only share what’s necessary to connect you with the right specialist.
          </p>

          <h2>Your rights</h2>
          <p>
            You have the right to access the personal data we hold about you, to request that it be corrected or
            deleted, and to withdraw your consent at any time. To exercise these rights, contact us at{' '}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </p>

          <h2>Contact us</h2>
          <p>
            If you have any questions about this privacy policy or how we handle your data, please email{' '}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call <a href={SITE.phoneHref}>{SITE.phone}</a>.
          </p>
        </div>
      </section>
    </>
  )
}
