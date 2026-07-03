import type { Metadata } from 'next'
import { ConsultingHero } from '@/components/marketing/consulting/ConsultingHero'
import { EditorialTestimonial } from '@/components/marketing/consulting/EditorialTestimonial'
import { EngagementProcess } from '@/components/marketing/consulting/EngagementProcess'
import { FeaturedCaseStudy } from '@/components/marketing/consulting/FeaturedCaseStudy'
import { OutcomesProofStrip } from '@/components/marketing/consulting/OutcomesProofStrip'
import { ServicesTeaser } from '@/components/marketing/consulting/ServicesTeaser'
import { CTASection } from '@/components/marketing/CTASection'
import { FAQSection } from '@/components/marketing/FAQSection'
import { FounderSection } from '@/components/marketing/FounderSection'
import {
  consultingServiceSchema,
  faqPageSchema,
  organizationSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { homeFaq, siteMeta } from '@/lib/marketing/consulting-copy'
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
          consultingServiceSchema(),
          faqPageSchema(homeFaq),
        ]}
      />
      <article>
        <ConsultingHero />
        <OutcomesProofStrip />
        <EngagementProcess />
        <ServicesTeaser />
        <FeaturedCaseStudy />
        <EditorialTestimonial />
        <FounderSection />
        <FAQSection
          id="faq-heading"
          title="Questions operators ask"
          subtitle="Honest answers about how engagements work."
          items={homeFaq}
        />
        <CTASection />
      </article>
    </>
  )
}
