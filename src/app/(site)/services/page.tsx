import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero, CtaBand } from '@/components/site/PageBits'

export const metadata: Metadata = { title: 'Services' }

const SERVICES = [
  ['Pensions', '/service/pensions', 'Reviews, transfers, SIPPs, drawdown and more — connected to a regulated specialist.'],
  ['Pension Consolidation', '/pension-consolidation', 'Bring your pension pots together into one easy-to-manage plan.'],
  ['Pension Review', '/pension-review', 'Make sure your pension is still working hard for your retirement.'],
  ['Pension Tracing', '/pension-tracing', 'Find and track down old, frozen pensions and maximise your returns.'],
  ['Defined Benefit Schemes', '/defined-benefit-schemes', 'Specialist advice on whether a final salary transfer is right for you.'],
  ['Set Up a Pension', '/set-up-pension', 'Choose the right pension and start saving for your retirement income.'],
  ['Investments', '/services', 'ISAs, bonds, unit trusts, stocks & shares and more, from expert advisers.'],
  ['Family Protection', '/services', 'Protect your loved ones with life cover and income protection.'],
  ['Tax & Estate Planning', '/services', 'Pass on more of your wealth with tax-efficient estate planning.'],
]

export default function ServicesPage() {
  return (
    <>
      <PageHero title="Services" />
      <section className="mpa-section">
        <div className="mpa-wrap">
          <div className="mpa-center" style={{ marginBottom: 44, maxWidth: 720 }}>
            <div className="mpa-eyebrow">How we help</div>
            <h2 className="mpa-h2">Free, independent financial advice — connected for you</h2>
            <p className="mpa-lead mpa-center">
              Whatever you need, we’ll match you with an FCA-regulated adviser who specialises in it.
            </p>
          </div>
          <div className="mpa-grid mpa-grid-3">
            {SERVICES.map(([t, href, b]) => (
              <Link href={href} className="mpa-card" key={t} style={{ display: 'block' }}>
                <h3>{t}</h3>
                <p>{b}</p>
                <span className="mpa-link-more">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  )
}
