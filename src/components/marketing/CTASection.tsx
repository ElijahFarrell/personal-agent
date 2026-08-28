import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ctaCopy } from '@/lib/marketing/consulting-copy'
import { bookCallUrl } from '@/lib/marketing/site'

export function CTASection() {
  const book = bookCallUrl()
  return (
    <section
      className="relative border-t border-border px-4 py-20 sm:px-6 sm:py-28"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-4xl">
        <p className="font-mono-accent text-muted-foreground">Get started</p>
        <h2
          id="cta-heading"
          className="font-display mt-4 max-w-xl text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl"
        >
          {ctaCopy.heading}
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">{ctaCopy.subheading}</p>
        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Button
            size="lg"
            className="h-12 rounded-md bg-brand-600 px-8 text-base font-semibold text-background hover:bg-brand-700"
            asChild
          >
            <Link href="/audit" className="gap-2">
              {ctaCopy.primaryLabel}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <a
            href={book}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {ctaCopy.secondaryLabel}
          </a>
        </div>
      </div>
    </section>
  )
}
