import type { Metadata } from 'next'
import { CTASection } from '@/components/marketing/CTASection'
import { FounderSection } from '@/components/marketing/FounderSection'
import { Hero } from '@/components/marketing/Hero'
import { HomeServicesTeaser } from '@/components/marketing/HomeServicesTeaser'
import { MetricsBar } from '@/components/marketing/MetricsBar'
import { ProcessSteps } from '@/components/marketing/ProcessSteps'
import {
  organizationSchema,
  professionalServiceSchema,
  reviewsJsonLd,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { Testimonials } from '@/components/marketing/Testimonials'
import { heroCopy, heroCtas, testimonials } from '@/lib/marketing/copy'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'Shiloh AI — AI consulting that ships production systems',
  description:
    'Free AI audit for founders and owner-operators. See where AI saves time and money, then get production systems built — tailored platform or your existing stack.',
  openGraph: {
    title: 'Shiloh AI — AI consulting that ships production systems',
    description:
      'Free personalized AI audit in minutes. Production consulting when you are ready to ship.',
    url: getMarketingSiteUrl(),
    siteName: 'Shiloh AI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shiloh AI — AI consulting that ships production systems',
    description:
      'Free personalized AI audit in minutes. Production consulting when you are ready to ship.',
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
        <ProcessSteps />
        <Testimonials />
        <FounderSection />
        <HomeServicesTeaser />
        <CTASection />
      </article>
    </>
  )
}
