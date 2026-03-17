import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Interface — AI × UX · Product · Design',
  description: 'A daily digest at the intersection of AI with UX Research, Product Management, and Product Design.',
  openGraph: {
    title: 'The Interface',
    description: 'Daily AI × UX · Product · Design digest',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
