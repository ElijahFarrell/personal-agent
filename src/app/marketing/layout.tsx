import { Fraunces, Source_Sans_3 } from 'next/font/google'
import { MarketingBackground } from '@/components/marketing/MarketingBackground'
import { ChatWidget } from '@/components/marketing/ChatWidget'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar'
import '@/styles/marketing-theme.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-marketing-sans',
  display: 'swap',
})

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`marketing-site ${fraunces.variable} ${sourceSans.variable} font-sans antialiased`}
      style={{ fontFamily: 'var(--font-marketing-sans), var(--font-geist-sans), sans-serif' }}
    >
      <MarketingBackground />
      <MarketingNavbar />
      <div className="relative z-10">{children}</div>
      <MarketingFooter />
      <ChatWidget />
    </div>
  )
}
