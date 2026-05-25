import type { Metadata } from 'next'
import { AgentShowcase } from '@/components/marketing/AgentShowcase'
import { CTASection } from '@/components/marketing/CTASection'
import { DeliveryModels } from '@/components/marketing/DeliveryModels'
import { PlatformCapabilities } from '@/components/marketing/PlatformCapabilities'
import { ValueProps } from '@/components/marketing/ValueProps'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'Services',
  description:
    'AI consulting services: audits, tailored Shiloh platform deployment, custom integrations into your stack, and ongoing fractional AI partnership.',
  openGraph: {
    title: 'Services · Shiloh AI',
    url: `${getMarketingSiteUrl()}/services`,
  },
}

export default function ServicesPage() {
  return (
    <article className="pb-8">
      <header className="mx-auto max-w-3xl px-4 pt-12 text-center sm:px-6 sm:pt-16">
        <p className="text-sm font-medium text-brand-300">
          Production AI consulting — we scope outcomes, ship systems, and stay
          accountable to metrics — whether you start from our platform or plug
          into tools you already run.
        </p>
        <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          AI consulting services
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Audits, deployments, integrations, and ongoing partnership — pick the
          engagement that matches where you are today.
        </p>
      </header>
      <ValueProps />
      <DeliveryModels />
      <AgentShowcase />
      <PlatformCapabilities />
      <CTASection />
    </article>
  )
}
