import Link from 'next/link'
import { NAV, SITE } from '@/lib/site'

function LogoMark() {
  return (
    <svg className="mpa-logo-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="#0170b9" />
      <path d="M9 27V14l6 7 6-7v13" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M24 27V13h5a4 4 0 0 1 0 8h-5" stroke="#f0a500" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function SiteHeader() {
  return (
    <header>
      <div className="mpa-topbar">
        <div className="mpa-wrap">
          <a href={`mailto:${SITE.email}`}>✉ {SITE.email}</a>
          <span className="mpa-spacer" />
          <span>{SITE.hours}</span>
          <a href={SITE.phoneHref}>☎ {SITE.phone}</a>
        </div>
      </div>

      <div className="mpa-header">
        <div className="mpa-wrap">
          <Link href="/" className="mpa-logo" aria-label="My Pension Advisor home">
            <LogoMark />
            <span>
              My Pension <b>Advisor</b>
            </span>
          </Link>

          <nav className="mpa-nav" aria-label="Primary">
            {NAV.map((item) => (
              <div className="mpa-nav-item" key={item.href}>
                <Link href={item.href}>
                  {item.label}
                  {item.children && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                </Link>
                {item.children && (
                  <div className="mpa-dropdown">
                    {item.children.map((c) => (
                      <Link href={c.href} key={c.href}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <Link href="/free-review" className="mpa-btn mpa-btn-gold mpa-header-cta">
            Free Review
          </Link>
        </div>
      </div>
    </header>
  )
}
