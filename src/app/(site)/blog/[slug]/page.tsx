import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CtaBand } from '@/components/site/PageBits'
import { POSTS, getPost } from '@/lib/blog'

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  return post ? { title: post.title, description: post.excerpt } : { title: 'Blog' }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <>
      <section className="mpa-pagehero">
        <div className="mpa-wrap">
          <div className="mpa-breadcrumb" style={{ marginBottom: 10 }}>
            <Link href="/blog">Blog</Link> / {post.category}
          </div>
          <h1 style={{ maxWidth: 820 }}>{post.title}</h1>
          <div className="mpa-breadcrumb">{fmtDate(post.date)}</div>
        </div>
      </section>

      <section className="mpa-section">
        <div className="mpa-wrap mpa-prose">
          {post.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          <p style={{ marginTop: 28 }}>
            <Link href="/free-review" className="mpa-btn mpa-btn-blue">
              Book a free pension review
            </Link>
          </p>
          <p style={{ marginTop: 32 }}>
            <Link href="/blog" className="mpa-link-more">
              ← Back to all articles
            </Link>
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
