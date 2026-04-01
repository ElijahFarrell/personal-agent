import type { Metadata } from 'next'
import { AgentShowcase } from '@/components/marketing/AgentShowcase'
import { CTASection } from '@/components/marketing/CTASection'
import { FounderSection } from '@/components/marketing/FounderSection'
import { Hero } from '@/components/marketing/Hero'
import { MetricsBar } from '@/components/marketing/MetricsBar'
import {
  organizationSchema,
  productSchema,
  reviewsJsonLd,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { Testimonials } from '@/components/marketing/Testimonials'
import { ValueProps } from '@/components/marketing/ValueProps'
import { testimonials } from '@/lib/marketing/copy'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'Shiloh AI — AI OS for real estate teams',
  description:
    'Shiloh AI is a production AI agency and AI OS for real estate: lead qualification, multichannel follow-up, unified inbox, and secure automation.',
  openGraph: {
    title: 'Shiloh AI — AI OS for real estate teams',
    description:
      'Faster speed-to-lead, unified tools, and agents that take action on your behalf.',
    url: getMarketingSiteUrl(),
    siteName: 'Shiloh AI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shiloh AI — AI OS for real estate teams',
    description:
      'Faster speed-to-lead, unified tools, and agents that take action on your behalf.',
  },
}

export default function MarketingHomePage() {
  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          productSchema(),
          reviewsJsonLd(testimonials),
        ]}
      />
      <article>
        <Hero
          title="An AI partner for modern real estate teams"
          subtitle="Shiloh AI brings lead qualification, multichannel outreach, and secure automation into one OS — so you respond in minutes, not hours."
        />
        <ValueProps />
        <AgentShowcase />
        <MetricsBar />
        <Testimonials />
        <FounderSection />
        <CTASection />
      </article>
    </>
  )
}
