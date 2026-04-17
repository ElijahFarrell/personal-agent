import type { Metadata } from 'next'
import { ComparisonTable } from '@/components/marketing/ComparisonTable'
import { CTASection } from '@/components/marketing/CTASection'
import { PricingCards } from '@/components/marketing/PricingCards'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'Engagements',
  description:
    'Engagement packages for AI consulting — audit, platform deployment, custom integrations, and ongoing partnership. Compare vs. generic agencies.',
  openGraph: {
    title: 'Engagements · Shiloh AI',
    url: `${getMarketingSiteUrl()}/pricing`,
  },
}

const vsAgencyRows = [
  {
    capability: 'Production code & ownership',
    shiloh: 'Custom Python, integrations, and clear handoff',
    traditional: 'Often templates, offshore, or no-code-only',
  },
  {
    capability: 'Delivery models',
    shiloh: 'Platform deployment or integrate into your stack',
    traditional: 'One-size SaaS or one-off project with no ops',
  },
  {
    capability: 'Accountability',
    shiloh: 'Scoped metrics — time, cost, revenue — before build',
    traditional: 'Vanity dashboards or vague “AI strategy”',
  },
] as const

export default function PricingPage() {
  return (
    <article className="px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-brand-300">
          Pricing is scoped to outcomes — audit, deployment, integration
          complexity, and ongoing partnership. We align to business impact, not
          seat-count alone.
        </p>
        <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
          Engagement packages
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Pick a lane — we refine scope on a strategy call.
        </p>
      </header>
      <div className="mx-auto mt-14 max-w-7xl">
        <PricingCards />
      </div>
      <div className="mx-auto mt-20 max-w-4xl">
        <ComparisonTable
          title="Shiloh AI consulting vs. a generic dev or marketing agency"
          caption="Illustrative comparison — refine with your ICP and proof points."
          rows={vsAgencyRows}
        />
      </div>
      <CTASection />
    </article>
  )
}
