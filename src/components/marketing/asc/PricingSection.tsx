import { ArrowUpRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pricingSection } from '@/lib/marketing/asc-copy'
import { bookCallUrl } from '@/lib/marketing/site'
import { SectionHeader } from './SectionHeader'

export function PricingSection() {
  const book = bookCallUrl()

  return (
    <section
      className="marketing-section relative border-y border-border/60 bg-card/30 px-4 py-16 sm:px-6 sm:py-24"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          id="pricing-heading"
          title={pricingSection.heading}
          subtitle={pricingSection.subheading}
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {pricingSection.tiers.map((tier) => (
            <article
              key={tier.name}
              className={`glass flex flex-col rounded-2xl p-7 sm:p-8 ${
                'highlighted' in tier && tier.highlighted
                  ? 'ring-2 ring-brand-500/40'
                  : ''
              }`}
            >
              <h3 className="font-display text-xl font-semibold text-foreground">
                {tier.name}
              </h3>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tabular-nums text-foreground">
                  {tier.price}
                </span>
                {'period' in tier && tier.period ? (
                  <span className="text-muted-foreground">{tier.period}</span>
                ) : null}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{tier.detail}</p>
              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-foreground/90"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                      aria-hidden
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {pricingSection.footnote}
        </p>

        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            className="h-12 rounded-full bg-brand-600 px-8 font-semibold text-white hover:bg-brand-700"
            asChild
          >
            <a href={book} target="_blank" rel="noopener noreferrer" className="gap-2">
              Book a 15-minute call
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
