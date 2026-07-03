import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { footerCopy } from '@/lib/marketing/consulting-copy'
import { bookCallUrl } from '@/lib/marketing/site'
import { MarketingLogo } from './MarketingLogo'

const footerNav = [
  { href: '/services', label: 'Services' },
  { href: '/work', label: 'Work' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/audit', label: 'Free AI Audit' },
] as const

export function MarketingFooter() {
  const book = bookCallUrl()
  const year = new Date().getFullYear()

  return (
    <footer className="relative z-10 border-t border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-4">
            <MarketingLogo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {footerCopy.tagline}
            </p>
            <p className="font-mono-accent text-brand-600">
              {footerCopy.engineerTag}
            </p>
          </div>
          <div>
            <p className="font-mono-accent mb-3 text-muted-foreground">
              Navigate
            </p>
            <ul className="space-y-2 text-sm">
              {footerNav.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono-accent mb-3 text-muted-foreground">
              Get started
            </p>
            <Button
              className="w-full rounded-full bg-brand-600 font-semibold text-white hover:bg-brand-700 sm:w-auto"
              asChild
            >
              <Link href="/audit" className="gap-2">
                Start the free AI audit
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              or{' '}
              <a
                href={book}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                book a strategy call
              </a>
            </p>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Shiloh AI. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/compliance-agreement" className="hover:text-foreground">
              Compliance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
