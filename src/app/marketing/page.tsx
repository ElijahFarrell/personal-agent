import type { Metadata } from 'next'
import { AscBenefits } from '@/components/marketing/asc/AscBenefits'
import { AscFinalCTA } from '@/components/marketing/asc/AscFinalCTA'
import { AscHero } from '@/components/marketing/asc/AscHero'
import { AscHowItWorks } from '@/components/marketing/asc/AscHowItWorks'
import { AudienceSection } from '@/components/marketing/asc/AudienceSection'
import { GuaranteeSection } from '@/components/marketing/asc/GuaranteeSection'
import { PricingSection } from '@/components/marketing/asc/PricingSection'
import { ProofSection } from '@/components/marketing/asc/ProofSection'
import { RevenueMathBlock } from '@/components/marketing/asc/RevenueMathBlock'
import { FAQSection } from '@/components/marketing/FAQSection'
import {
  ascHealthcareServiceSchema,
  faqPageSchema,
  organizationSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { ascFaq, siteMeta } from '@/lib/marketing/asc-copy'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: siteMeta.title,
  description: siteMeta.description,
  openGraph: {
    title: siteMeta.title,
    description: siteMeta.description,
    url: getMarketingSiteUrl(),
    siteName: 'Shiloh AI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteMeta.title,
    description: siteMeta.description,
  },
}

export default function MarketingHomePage() {
  return (
    <>
      <StructuredData
        data={[
          organizationSchema(),
          ascHealthcareServiceSchema(),
          faqPageSchema(ascFaq),
        ]}
      />
      <article>
        <AscHero />
        <RevenueMathBlock />
        <AudienceSection />
        <AscHowItWorks />
        <AscBenefits />
        <ProofSection />
        <GuaranteeSection />
        <PricingSection />
        <FAQSection
          id="faq-heading"
          title="Questions administrators ask"
          subtitle="Compliance, differentiation, and what we need to get started."
          items={ascFaq}
        />
        <AscFinalCTA />
      </article>
    </>
  )
}
