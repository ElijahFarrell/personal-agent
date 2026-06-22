import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { finalCta } from '@/lib/marketing/asc-copy'
import { bookCallUrl } from '@/lib/marketing/site'

export function AscFinalCTA() {
  const book = bookCallUrl()

  return (
    <section
      className="marketing-section relative px-4 py-20 sm:px-6 sm:py-28"
      aria-labelledby="final-cta-heading"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="final-cta-heading"
          className="font-display text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem]"
        >
          {finalCta.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
          {finalCta.subheading}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-12 rounded-full bg-brand-600 px-8 text-base font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700"
            asChild
          >
            <a href={book} target="_blank" rel="noopener noreferrer" className="gap-2">
              {finalCta.primaryLabel}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-border bg-card px-8 text-base hover:bg-muted"
            asChild
          >
            <a href="#sample-call">{finalCta.secondaryLabel}</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
