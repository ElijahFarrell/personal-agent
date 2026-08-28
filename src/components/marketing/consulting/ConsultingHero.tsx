import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuditReportArtifact } from '@/components/marketing/consulting/AuditReportArtifact'
import { heroCopy, heroCtas } from '@/lib/marketing/consulting-copy'

export function ConsultingHero() {
  const { primaryCta, secondaryCta } = heroCtas()

  return (
    <section className="relative px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="animate-fade-up">
          <p className="font-mono-accent text-muted-foreground">{heroCopy.eyebrow}</p>
          <h1 className="font-display mt-4 text-[2.5rem] font-normal leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[4rem]">
            {heroCopy.title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {heroCopy.subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-12 rounded-md bg-brand-600 px-7 text-base font-semibold text-background hover:bg-brand-700"
              asChild
            >
              <Link href={primaryCta.href} className="gap-2">
                {primaryCta.label}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-md border-border bg-transparent px-7 text-base hover:bg-secondary"
              asChild
            >
              <a href={secondaryCta.href} target="_blank" rel="noopener noreferrer">
                {secondaryCta.label}
              </a>
            </Button>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{heroCopy.trustLine}</p>
          <p className="mt-2 text-xs text-muted-foreground">{heroCopy.footnote}</p>
        </div>
        <div className="animate-fade-up-delay-2 lg:justify-self-end">
          <AuditReportArtifact />
        </div>
      </div>
    </section>
  )
}
