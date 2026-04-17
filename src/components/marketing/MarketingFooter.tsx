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
    <footer className="relative z-10 border-t border-white/[0.08] bg-background/40 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-4">
            <MarketingLogo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Shiloh AI is an AI consulting practice — production systems,
              tailored platform deployments, and custom integrations for teams
              that need outcomes, not slide decks.
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
                      className="text-muted-foreground transition-colors hover:text-white"
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
                    className="text-muted-foreground transition-colors hover:text-white"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-muted-foreground transition-colors hover:text-white"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/real-estate"
                    className="text-muted-foreground transition-colors hover:text-white"
                  >
                    Real estate
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                App
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href={`${app}/sign-in`}
                    className="text-muted-foreground transition-colors hover:text-white"
                  >
                    Sign in
                  </a>
                </li>
                <li>
                  <Link
                    href="/audit"
                    className="text-muted-foreground transition-colors hover:text-white"
                  >
                    Free AI Audit
                  </Link>
                </li>
                <li>
                  <a
                    href={book}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-white"
                  >
                    Book a strategy call
                  </a>
                </li>
                <li>
                  <a
                    href={`${app}/dashboard`}
                    className="text-muted-foreground transition-colors hover:text-white"
                  >
                    Dashboard
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/[0.06] pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Shiloh AI. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-muted-foreground/80">
              AI consulting and production platform — built for SMBs and ops
              teams.
            </p>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/compliance-agreement" className="hover:text-white">
              Compliance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
