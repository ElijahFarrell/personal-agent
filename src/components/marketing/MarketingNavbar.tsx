'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { bookCallUrl } from '@/lib/marketing/site'
import { MarketingLogo } from './MarketingLogo'

const nav = [
  { href: '#how-it-works-heading', label: 'How It Works' },
  { href: '#pricing-heading', label: 'Pricing' },
  { href: '#faq-heading', label: 'FAQ' },
] as const

function normalizeMarketingPath(pathname: string | null): string {
  if (!pathname) return '/'
  if (pathname === '/marketing' || pathname === '/marketing/') return '/'
  if (pathname.startsWith('/marketing/')) {
    const rest = pathname.slice('/marketing'.length)
    return rest || '/'
  }
  return pathname
}

export function MarketingNavbar() {
  const pathname = normalizeMarketingPath(usePathname())
  const [open, setOpen] = useState(false)
  const book = bookCallUrl()
  const isHome = pathname === '/'

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <MarketingLogo />
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          {nav.map(({ href, label }) => {
            const isHash = href.startsWith('#')
            const isActive =
              !isHash &&
              (pathname === href || pathname.startsWith(`${href}/`))

            if (isHash && isHome) {
              return (
                <a
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label}
                </a>
              )
            }

            if (isHash) {
              return (
                <Link
                  key={href}
                  href={`/${href}`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  isActive && 'bg-muted text-foreground'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="hidden rounded-full bg-brand-600 px-5 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:inline-flex"
            asChild
          >
            <a href={book} target="_blank" rel="noopener noreferrer">
              Book a 15-min call
            </a>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="border-border bg-card md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(100vw,20rem)] border-border bg-card"
            >
              <SheetHeader>
                <SheetTitle className="text-left text-foreground">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                {nav.map(({ href, label }) => {
                  const isHash = href.startsWith('#')
                  const linkHref = isHash && !isHome ? `/${href}` : href

                  if (isHash || href.startsWith('#')) {
                    return (
                      <a
                        key={href}
                        href={linkHref}
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {label}
                      </a>
                    )
                  }

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {label}
                    </Link>
                  )
                })}
                <a
                  href={book}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg bg-brand-600 px-3 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Book a 15-min call
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
