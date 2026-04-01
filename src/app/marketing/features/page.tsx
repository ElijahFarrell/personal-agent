import type { Metadata } from 'next'
import { CTASection } from '@/components/marketing/CTASection'
import { ValueProps } from '@/components/marketing/ValueProps'
import { AgentShowcase } from '@/components/marketing/AgentShowcase'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Lead qualification agents, reactivation, unified inbox, workflows, Retell voice, and CRM automation — Shiloh AI OS capabilities.',
  openGraph: {
    title: 'Features · Shiloh AI',
    url: `${getMarketingSiteUrl()}/features`,
  },
}

export default function FeaturesPage() {
  return (
    <article className="pb-8">
      <header className="mx-auto max-w-3xl px-4 pt-12 text-center sm:px-6 sm:pt-16">
        <p className="text-sm font-medium text-brand-300">
          Shiloh AI OS connects your tools and runs qualification, follow-up, and
          research agents behind one glass pane — with approvals and audit
          trails for production use.
        </p>
        <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
          Platform capabilities
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Everything below ships as modular agents and workflows — swap in what
          your brokerage needs first.
        </p>
      </header>
      <ValueProps />
      <AgentShowcase />
      <CTASection />
    </article>
  )
}
