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
import { MarketingLogo } from './MarketingLogo'

const nav = [
  { href: '/services', label: 'Services' },
  { href: '/work', label: 'Work' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
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

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <MarketingLogo />
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          {nav.map(({ href, label }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`)

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  isActive && 'text-foreground'
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
            className="hidden rounded-full bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700 sm:inline-flex"
            asChild
          >
            <Link href="/audit">Get your free AI audit</Link>
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
              className="flex flex-col border-border bg-card"
            >
              <SheetHeader>
                <SheetTitle className="text-left text-foreground">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Mobile">
                {nav.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <Link
                href="/audit"
                onClick={() => setOpen(false)}
                className="mt-auto rounded-full bg-brand-600 px-3 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700"
              >
                Get your free AI audit
              </Link>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
