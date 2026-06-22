import { Newsreader, Figtree } from 'next/font/google'
import { MarketingBackground } from '@/components/marketing/MarketingBackground'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar'
import '@/styles/marketing-theme.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const figtree = Figtree({
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
      className={`marketing-site ${newsreader.variable} ${figtree.variable} font-sans antialiased`}
      style={{
        fontFamily: 'var(--font-marketing-sans), ui-sans-serif, sans-serif',
      }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <MarketingBackground />
      <MarketingNavbar />
      <main id="main-content" className="relative z-10">
        {children}
      </main>
      <MarketingFooter />
    </div>
  )
}
