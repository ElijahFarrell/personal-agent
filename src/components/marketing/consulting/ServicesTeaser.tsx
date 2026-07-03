import Link from 'next/link'
import { capabilityOffers } from '@/lib/marketing/consulting-copy'

export function ServicesTeaser() {
  return (
    <section
      className="relative px-4 py-20 sm:px-6 sm:py-32"
      aria-labelledby="services-teaser-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="services-teaser-heading"
            className="font-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl"
          >
            What we build
          </h2>
          <Link
            href="/services"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View all services →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilityOffers.map((offer) => (
            <Link
              key={offer.id}
              href={offer.href}
              className="marketing-card group rounded-xl p-6 transition-colors hover:border-brand-300"
            >
              <p className="font-mono-accent text-brand-600">{offer.tag}</p>
              <h3 className="font-display mt-3 text-lg text-foreground">
                {offer.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {offer.outcome}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
