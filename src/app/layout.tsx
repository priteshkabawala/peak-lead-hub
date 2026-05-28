import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PeaK Lead Hub',
  description: 'LinkedIn Lead CRM — Peak Personal Finance',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
