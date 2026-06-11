import Link from 'next/link'
import { SITE } from '@/lib/site'

export default function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mpa-footer">
      <div className="mpa-wrap">
        <div className="mpa-footer-grid">
          <div>
            <div className="mpa-logo" style={{ color: '#fff', marginBottom: 14 }}>
              My Pension <b style={{ color: '#f0a500' }}>Advisor</b>
            </div>
            <p style={{ maxWidth: 320 }}>
              We connect you, free of charge, with FCA-regulated financial advisers to help you plan for a
              comfortable, stress-free retirement.
            </p>
          </div>

          <div>
            <h4>Navigate</h4>
            <ul>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about-us">About</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/contact-us">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4>Services</h4>
            <ul>
              <li><Link href="/service/pensions">Pensions</Link></li>
              <li><Link href="/pension-consolidation">Pension Consolidation</Link></li>
              <li><Link href="/pension-review">Pension Review</Link></li>
              <li><Link href="/pension-tracing">Pension Tracing</Link></li>
              <li><Link href="/defined-benefit-schemes">Defined Benefit Schemes</Link></li>
              <li><Link href="/set-up-pension">Set Up Pension</Link></li>
            </ul>
          </div>

          <div>
            <h4>Get in touch</h4>
            <ul>
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li><a href={SITE.phoneHref}>{SITE.phone}</a></li>
              <li><a href={SITE.mobileHref}>{SITE.mobile}</a></li>
              <li>{SITE.hours}</li>
            </ul>
            <Link href="/free-review" className="mpa-btn mpa-btn-gold" style={{ marginTop: 16 }}>
              Get a Free Review
            </Link>
          </div>
        </div>

        <p className="mpa-footer-disclaimer">
          My Pension Advisor is an introducer and connects you with FCA-regulated financial advisers. We do not
          provide regulated financial advice ourselves. The value of investments and any income from them can fall
          as well as rise and you may get back less than you invested. This website is a demonstration rebuild.
        </p>

        <div className="mpa-footer-bottom">
          <span>© {year} My Pension Advisor. All rights reserved.</span>
          <span>
            <Link href="/privacy-policy">Privacy Policy</Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
