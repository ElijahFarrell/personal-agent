import Link from 'next/link'
import { MarketingLogo } from './MarketingLogo'
import { bookCallUrl, getAppPlatformUrl } from '@/lib/marketing/site'

const footerNav = [
  { href: '/features', label: 'Features' },
  { href: '/real-estate', label: 'Real estate' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
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
              Shiloh AI builds production AI systems for real estate teams —
              faster speed-to-lead, unified channels, and secure automation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Product
              </p>
              <ul className="space-y-2 text-sm">
                {footerNav.slice(0, 3).map(({ href, label }) => (
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
                    Book a demo
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
          <p className="text-muted-foreground/80">
            Shiloh AI OS — AI automation for real estate teams.
          </p>
        </div>
      </div>
    </footer>
  )
}
