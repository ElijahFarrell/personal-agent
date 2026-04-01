import type { Metadata } from 'next'
import { ComparisonTable } from '@/components/marketing/ComparisonTable'
import { CTASection } from '@/components/marketing/CTASection'
import { PricingCards } from '@/components/marketing/PricingCards'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Shiloh AI OS pricing for real estate teams — compare vs. hiring a VA or stitching SaaS tools.',
  openGraph: {
    title: 'Pricing · Shiloh AI',
    url: `${getMarketingSiteUrl()}/pricing`,
  },
}

const vsVaRows = [
  {
    capability: '24/7 lead response',
    shiloh: 'Consistent, policy-bound automation',
    traditional: 'Depends on shift coverage',
  },
  {
    capability: 'CRM hygiene',
    shiloh: 'Structured fields + tasks from conversations',
    traditional: 'Manual data entry',
  },
  {
    capability: 'Scale',
    shiloh: 'Add agents & workflows without headcount steps',
    traditional: 'Linear hiring cost',
  },
] as const

export default function PricingPage() {
  return (
    <article className="px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-brand-300">
          Pricing is tailored to team size, integrations, and compliance needs —
          we align to pipeline impact, not seat-count alone.
        </p>
        <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
          Simple tiers, serious outcomes
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Replace placeholder numbers with your packaged offers when ready.
        </p>
      </header>
      <div className="mx-auto mt-14 max-w-6xl">
        <PricingCards />
      </div>
      <div className="mx-auto mt-20 max-w-4xl">
        <ComparisonTable
          title="Shiloh AI OS vs. hiring another coordinator"
          caption="Illustrative comparison — refine with your ICP data."
          rows={vsVaRows}
        />
      </div>
      <CTASection />
    </article>
  )
}
