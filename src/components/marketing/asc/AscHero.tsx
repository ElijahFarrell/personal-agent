import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ascHero } from '@/lib/marketing/asc-copy'
import { SampleCallPlayer } from './SampleCallPlayer'

export function AscHero() {
  return (
    <section className="relative px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="animate-fade-up">
          <p className="mb-5 inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
            {ascHero.badge}
          </p>
          <h1 className="font-display text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            {ascHero.title}
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {ascHero.subtitle}
          </p>

          <ul
            className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-foreground/85"
            aria-label="Trust signals"
          >
            {ascHero.trustStrip.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <ShieldCheck
                  className="h-4 w-4 shrink-0 text-brand-600"
                  aria-hidden
                />
                <span translate="no">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-12 rounded-full bg-brand-600 px-8 text-base font-semibold text-background shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-700"
              asChild
            >
              <a
                href={ascHero.primaryCta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                {ascHero.primaryCta.label}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-border bg-card px-8 text-base font-medium text-foreground transition-colors hover:bg-muted"
              asChild
            >
              <a href={ascHero.secondaryCta.href}>{ascHero.secondaryCta.label}</a>
            </Button>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{ascHero.footnote}</p>
        </div>

        <div className="animate-fade-up-delay-2 lg:justify-self-end">
          <SampleCallPlayer />
        </div>
      </div>
    </section>
  )
}
