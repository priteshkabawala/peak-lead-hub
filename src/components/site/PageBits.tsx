import Link from 'next/link'

export function PageHero({ title, crumb }: { title: string; crumb?: string }) {
  return (
    <section className="mpa-pagehero">
      <div className="mpa-wrap">
        <h1>{title}</h1>
        <div className="mpa-breadcrumb">
          <Link href="/">Home</Link> / {crumb || title}
        </div>
      </div>
    </section>
  )
}

export function CtaBand({
  title = 'Get expert pension advice',
  body = 'We’ll connect you free of charge to the best financial adviser to help you plan your retirement.',
  cta = 'Book Your Free Review',
  href = '/free-review',
}: {
  title?: string
  body?: string
  cta?: string
  href?: string
}) {
  return (
    <section className="mpa-section">
      <div className="mpa-wrap">
        <div className="mpa-ctaband">
          <h2>{title}</h2>
          <p>{body}</p>
          <Link href={href} className="mpa-btn mpa-btn-gold">
            {cta}
          </Link>
        </div>
      </div>
    </section>
  )
}
