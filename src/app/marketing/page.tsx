import type { Metadata } from 'next'
import { AgentShowcase } from '@/components/marketing/AgentShowcase'
import { CTASection } from '@/components/marketing/CTASection'
import { DeliveryModels } from '@/components/marketing/DeliveryModels'
import { FounderSection } from '@/components/marketing/FounderSection'
import { Hero } from '@/components/marketing/Hero'
import { MetricsBar } from '@/components/marketing/MetricsBar'
import { PlatformCapabilities } from '@/components/marketing/PlatformCapabilities'
import { ProcessSteps } from '@/components/marketing/ProcessSteps'
import {
  organizationSchema,
  professionalServiceSchema,
  reviewsJsonLd,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { Testimonials } from '@/components/marketing/Testimonials'
import { ValueProps } from '@/components/marketing/ValueProps'
import { heroCopy, heroCtas, testimonials } from '@/lib/marketing/copy'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'Shiloh AI — AI consulting that ships production systems',
  description:
    'AI consulting for SMBs, founders, and ops leaders: audits, tailored platform deployment, custom integrations, and production AI with guardrails.',
  openGraph: {
    title: 'Shiloh AI — AI consulting that ships production systems',
    description:
      'From audit to roadmap to production — tailored AI platform deployments or integrations into your existing stack.',
    url: getMarketingSiteUrl(),
    siteName: 'Shiloh AI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shiloh AI — AI consulting that ships production systems',
    description:
      'From audit to roadmap to production — tailored AI platform deployments or integrations into your existing stack.',
  },
}

export default function MarketingHomePage() {
  const ctas = heroCtas()
  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          professionalServiceSchema(),
          reviewsJsonLd(testimonials),
        ]}
      />
      <article>
        <Hero
          badge={heroCopy.badge}
          title={heroCopy.title}
          subtitle={heroCopy.subtitle}
          primaryCta={ctas.primaryCta}
          secondaryCta={ctas.secondaryCta}
        />
        <MetricsBar />
        <ValueProps />
        <DeliveryModels />
        <AgentShowcase />
        <PlatformCapabilities />
        <ProcessSteps />
        <Testimonials />
        <FounderSection />
        <CTASection />
      </article>
    </>
  )
}
