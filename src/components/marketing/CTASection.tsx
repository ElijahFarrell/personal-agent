import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ctaCopy } from '@/lib/marketing/copy'
import { bookCallUrl } from '@/lib/marketing/site'

export function CTASection() {
  const book = bookCallUrl()
  return (
    <section
      className="relative px-4 py-20 sm:px-6"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-card to-background px-6 py-14 text-center shadow-sm sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(14_52%_50%_/_0.12),_transparent_65%)]"
          />
          <div className="relative">
            <h2
              id="cta-heading"
              className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
            >
              {ctaCopy.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {ctaCopy.subheading}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="h-12 rounded-full bg-brand-600 px-8 text-base font-semibold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700"
                asChild
              >
                <a href="/audit" className="gap-2">
                  {ctaCopy.primaryLabel}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
              <p className="text-sm text-muted-foreground">
                or{' '}
                <Link
                  href={book}
                  className="font-medium text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ctaCopy.secondaryLabel}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
