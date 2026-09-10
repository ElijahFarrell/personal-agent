import Link from 'next/link'
import { EvidenceBadge } from '@/components/marketing/consulting/EvidenceBadge'
import { outcomeMetrics, outcomesCaption } from '@/lib/marketing/consulting-copy'

export function OutcomesProofStrip() {
  return (
    <section
      className="border-y border-border bg-card/60 py-12 sm:py-16"
      aria-labelledby="outcomes-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 id="outcomes-heading" className="sr-only">
          Client outcomes
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {outcomeMetrics.map((metric) => (
            <Link
              key={metric.label}
              href={metric.href}
              className="group text-center transition-colors sm:text-left"
            >
              <p className="font-display text-4xl tabular-nums text-foreground transition-colors group-hover:text-brand-600 sm:text-5xl">
                {metric.value}
              </p>
              <p className="mt-2">
                <EvidenceBadge status={metric.status} />
              </p>
              <p className="font-mono-accent mt-1 text-muted-foreground group-hover:text-foreground">
                {metric.label}
              </p>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {outcomesCaption}
        </p>
      </div>
    </section>
  )
}
