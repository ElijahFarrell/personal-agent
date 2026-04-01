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
  badge = 'AI for real estate teams',
  title,
  subtitle,
  primaryCta = { label: 'Get your free AI audit', href: '/audit' },
  secondaryCta = { label: 'Book a demo', href: bookCallUrl() },
}: HeroProps) {
  return (
    <section className="relative px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-16">
      <div className="mx-auto max-w-4xl text-center">
        {badge ? (
          <p className="mb-6 inline-flex items-center rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-200 shadow-[0_0_32px_-8px_rgba(124,58,237,0.5)]">
            {badge}
          </p>
        ) : null}
        <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {subtitle}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            className="h-12 rounded-full bg-brand-600 px-8 text-base shadow-xl shadow-brand-600/30 hover:bg-brand-500"
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
            className="glass h-12 rounded-full border-white/15 bg-white/5 px-8 text-base text-white hover:bg-white/10"
            asChild
          >
            <a href={secondaryCta.href}>{secondaryCta.label}</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
