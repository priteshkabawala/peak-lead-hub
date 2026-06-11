import type { Metadata } from 'next'
import './site.css'
import SiteHeader from '@/components/site/SiteHeader'
import SiteFooter from '@/components/site/SiteFooter'

export const metadata: Metadata = {
  title: {
    default: 'My Pension Advisor — Free, Independent Pension Advice',
    template: '%s — My Pension Advisor',
  },
  description:
    'My Pension Advisor connects you, free of charge, with FCA-regulated financial advisers for pension reviews, consolidation, tracing and retirement planning.',
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mpa-root">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
