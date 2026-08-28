import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { bookCallUrl } from '@/lib/marketing/site'

type HeroProps = {
  badge?: string
  title: string
  subtitle: string
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

export function Hero({
  badge = 'Free AI audit',
  title,
  subtitle,
  primaryCta = { label: 'Get your free AI audit', href: '/audit' },
  secondaryCta = { label: 'Book a strategy call', href: bookCallUrl() },
}: HeroProps) {
  return (
    <section className="relative px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-14">
      <div className="mx-auto max-w-4xl text-center">
        {badge ? (
          <p className="mb-6 inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
            {badge}
          </p>
        ) : null}
        <h1 className="font-display text-4xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl md:text-[3.25rem] md:leading-[1.08]">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {subtitle}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            className="h-12 rounded-full bg-brand-600 px-8 text-base font-semibold text-background shadow-md shadow-brand-600/20 hover:bg-brand-700"
            asChild
          >
            <a href={primaryCta.href} className="gap-2">
              {primaryCta.label}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-border bg-card/80 px-8 text-base text-foreground hover:bg-muted"
            asChild
          >
            <a href={secondaryCta.href}>{secondaryCta.label}</a>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          ~5 minutes · No credit card · Report in your inbox
        </p>
      </div>
    </section>
  )
}
