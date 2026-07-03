import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ctaCopy } from '@/lib/marketing/consulting-copy'
import { bookCallUrl } from '@/lib/marketing/site'

export function CTASection() {
  const book = bookCallUrl()
  return (
    <section
      className="relative px-4 py-20 sm:px-6 sm:py-28"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-4xl">
        <div className="marketing-card rounded-2xl border-brand-200 bg-brand-50/40 px-6 py-14 text-center sm:px-12">
          <h2
            id="cta-heading"
            className="font-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl"
          >
            {ctaCopy.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {ctaCopy.subheading}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <Button
              size="lg"
              className="h-12 rounded-full bg-brand-600 px-8 text-base font-semibold text-white hover:bg-brand-700"
              asChild
            >
              <Link href="/audit" className="gap-2">
                {ctaCopy.primaryLabel}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              or{' '}
              <a
                href={book}
                className="font-medium text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {ctaCopy.secondaryLabel}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
