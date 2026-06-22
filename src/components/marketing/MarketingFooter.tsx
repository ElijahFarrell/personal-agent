import Link from 'next/link'
import { MarketingLogo } from './MarketingLogo'
import { bookCallUrl } from '@/lib/marketing/site'

const footerNav = [
  { href: '/#how-it-works-heading', label: 'How It Works' },
  { href: '/#pricing-heading', label: 'Pricing' },
  { href: '/#faq-heading', label: 'FAQ' },
] as const

export function MarketingFooter() {
  const book = bookCallUrl()
  const year = new Date().getFullYear()

  return (
    <footer className="relative z-10 border-t border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-4">
            <MarketingLogo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              HIPAA-compliant pre-op and post-op calling for independent surgery
              centers. Recover cases you were losing to no-shows.
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-brand-700">
              <span>HIPAA-compliant</span>
              <span aria-hidden>·</span>
              <span>Signed BAA</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Get started
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href={book}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-600 transition-colors hover:text-brand-700"
                  >
                    Book a 15-minute call
                  </a>
                </li>
                <li>
                  <Link
                    href="/#sample-call"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Hear a sample call
                  </Link>
                </li>
              </ul>
            </div>
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
