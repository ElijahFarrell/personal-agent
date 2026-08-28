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
          <div>
            <p className="font-mono-accent text-muted-foreground">What we do</p>
            <h2
              id="services-teaser-heading"
              className="font-display mt-3 text-3xl tracking-tight text-foreground sm:text-4xl"
            >
              What we build
            </h2>
          </div>
          <Link
            href="/services"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View all services →
          </Link>
        </div>
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
          {capabilityOffers.map((offer, index) => (
            <Link
              key={offer.id}
              href={offer.href}
              className="group border-t border-border py-8 pr-8 transition-colors last:border-b sm:border-b hover:text-brand-600 lg:[&:nth-child(3n)]:pr-0"
            >
              <p className="font-mono-accent text-muted-foreground">
                .{String(index + 1).padStart(2, '0')}
              </p>
              <h3 className="font-display mt-4 text-xl text-foreground transition-colors group-hover:text-brand-600">
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
