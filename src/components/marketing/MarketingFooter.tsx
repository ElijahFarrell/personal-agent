import Link from 'next/link'
import { MarketingLogo } from './MarketingLogo'
import { bookCallUrl, getAppPlatformUrl } from '@/lib/marketing/site'

const footerNav = [
  { href: '/services', label: 'Services' },
  { href: '/industries', label: 'Industries' },
  { href: '/pricing', label: 'Engagements' },
] as const

export function MarketingFooter() {
  const app = getAppPlatformUrl()
  const book = bookCallUrl()
  return (
    <footer className="relative z-10 border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-4">
            <MarketingLogo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              AI consulting that ships production systems — free audit to
              scoped roadmap to build on our platform or your stack.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Services
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
                Company
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/about"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/real-estate"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Real estate
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Get started
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/audit"
                    className="font-medium text-brand-600 transition-colors hover:text-brand-700"
                  >
                    Free AI audit
                  </Link>
                </li>
                <li>
                  <a
                    href={book}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Book a strategy call
                  </a>
                </li>
                <li>
                  <a
                    href={`${app}/dashboard`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Dashboard
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Shiloh AI. All rights reserved.</p>
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
