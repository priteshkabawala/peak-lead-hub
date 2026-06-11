import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero, CtaBand } from '@/components/site/PageBits'
import { POSTS } from '@/lib/blog'

export const metadata: Metadata = { title: 'Blog' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BlogIndex() {
  return (
    <>
      <PageHero title="Blog" />
      <section className="mpa-section">
        <div className="mpa-wrap">
          <div className="mpa-grid mpa-grid-3">
            {POSTS.map((p) => (
              <article className="mpa-card" key={p.slug} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="mpa-eyebrow" style={{ marginBottom: 8 }}>{p.category}</div>
                <h3 style={{ fontSize: 19, marginBottom: 8 }}>
                  <Link href={`/blog/${p.slug}`} style={{ color: 'inherit' }}>
                    {p.title}
                  </Link>
                </h3>
                <p style={{ flex: 1 }}>{p.excerpt}</p>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--mpa-muted)' }}>{fmtDate(p.date)}</span>
                  <Link href={`/blog/${p.slug}`} className="mpa-link-more">
                    Read more →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  )
}
