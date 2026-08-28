import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ArchitectureDiagram } from '@/components/marketing/consulting/WorkflowDiagram'
import type { ServiceDetail } from '@/lib/marketing/consulting-copy'

export function ServiceSection({ service }: { service: ServiceDetail }) {
  return (
    <section
      id={service.id}
      className="marketing-section border-t border-border px-4 py-16 sm:px-6 sm:py-20"
      aria-labelledby={`service-${service.id}`}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id={`service-${service.id}`}
          className="font-display text-3xl font-normal tracking-tight text-foreground"
        >
          {service.title}
        </h2>
        <p className="mt-2 font-mono text-sm text-brand-600">
          {service.priceRange} · {service.timeline}
        </p>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          {service.whoFor}
        </p>

        <h3 className="mt-8 text-sm font-semibold text-foreground">
          What&apos;s delivered
        </h3>
        <ul className="mt-3 space-y-2">
          {service.delivered.map((item) => (
            <li
              key={item}
              className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
            >
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>

        <ArchitectureDiagram steps={service.architecture} className="mt-8" />

        {service.proofSlug ? (
          <Link
            href={`/work/${service.proofSlug}`}
            className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            See related case study →
          </Link>
        ) : null}

        <div className="mt-10">
          <Button
            size="sm"
            className="rounded-full bg-brand-600 font-semibold text-background hover:bg-brand-700"
            asChild
          >
            <Link href="/audit" className="gap-2">
              Start with the free audit
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
