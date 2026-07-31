import type { Metadata, Viewport } from 'next'
import './elite.css'

export const metadata: Metadata = {
  title: 'Peak Private — Financial Planning for Athletes & Public Figures',
  description:
    'An interactive financial planning guide for professional athletes, entertainers and public figures. Model how long your wealth lasts, stress-test your plan and build a personalised roadmap.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#070b14' },
    { media: '(prefers-color-scheme: light)', color: '#f7f5f1' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function EliteLayout({ children }: { children: React.ReactNode }) {
  return children
}
