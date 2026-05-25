import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { CTASection } from '@/components/marketing/CTASection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { industriesList } from '@/lib/marketing/copy'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'Industries',
  description:
    'AI consulting across real estate, healthcare, nonprofits, finance, education, and professional services — production systems with measurable ROI.',
  openGraph: {
    title: 'Industries · Shiloh AI',
    url: `${getMarketingSiteUrl()}/industries`,
  },
}

export default function IndustriesPage() {
  return (
    <article className="px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-brand-300">
          Same consulting rigor — different workflows, compliance, and data
          models.
        </p>
        <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Industries we serve
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Deep dives by vertical — real estate has a dedicated page; others
          follow the same audit → design → build → operate playbook.
        </p>
      </header>

      <ul className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {industriesList.map((ind) => {
          const isRealEstate = ind.slug === 'real-estate'
          const inner = (
            <>
              <CardHeader>
                <CardTitle className="font-display flex items-center justify-between text-xl text-foreground">
                  {ind.label}
                  {isRealEstate ? (
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-brand-400" />
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {ind.description}
                </p>
                {ind.proof ? (
                  <p className="mt-3 text-xs text-brand-200/90">
                    Proof: {ind.proof}
                  </p>
                ) : null}
              </CardContent>
            </>
          )
          return (
            <li key={ind.slug}>
              {isRealEstate ? (
                <Link href="/real-estate" className="block h-full">
                  <Card className="glass h-full border-white/10 bg-card/40 transition-colors hover:border-brand-500/30">
                    {inner}
                  </Card>
                </Link>
              ) : (
                <Card className="glass h-full border-white/10 bg-card/40">
                  {inner}
                </Card>
              )}
            </li>
          )
        })}
      </ul>

      <CTASection />
    </article>
  )
}
