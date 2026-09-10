import type { Metadata } from 'next'
import { OfferLadder } from '@/components/marketing/consulting/OfferLadder'
import { CTASection } from '@/components/marketing/CTASection'
import { FAQSection } from '@/components/marketing/FAQSection'
import { PricingCards } from '@/components/marketing/PricingCards'
import {
  breadcrumbSchema,
  faqPageSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import {
  pricingFaq,
  pricingPage,
  pricingTiers,
} from '@/lib/marketing/consulting-copy'
import { marketingMetadata } from '@/lib/marketing/seo'

export const metadata: Metadata = marketingMetadata({
  title: pricingPage.title,
  description: pricingPage.subheading,
  path: '/pricing',
  ogTitle: `${pricingPage.title} · Shiloh`,
})

export default function PricingPage() {
  return (
    <>
      <StructuredData
        data={[
          faqPageSchema(pricingFaq),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
          ]),
        ]}
      />
      <article className="px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-normal tracking-tight text-foreground md:text-5xl">
            {pricingPage.heading}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {pricingPage.subheading}
          </p>
          <p className="mt-6 text-sm font-medium text-foreground">
            {pricingPage.principle}
          </p>
        </header>

        <div className="mx-auto mt-14 max-w-6xl">
          <OfferLadder />
        </div>

        <div className="mx-auto mt-20 max-w-6xl">
          <PricingCards tiers={pricingTiers} />
        </div>

        <FAQSection
          id="pricing-faq"
          title="Pricing questions"
          items={pricingFaq}
        />

        <CTASection />
      </article>
    </>
  )
}
