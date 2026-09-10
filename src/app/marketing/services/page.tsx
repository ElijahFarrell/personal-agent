import type { Metadata } from 'next'
import { ServiceSection } from '@/components/marketing/consulting/ServiceSection'
import { CTASection } from '@/components/marketing/CTASection'
import {
  breadcrumbSchema,
  serviceCatalogSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { serviceDetails, servicesPage } from '@/lib/marketing/consulting-copy'
import { marketingMetadata } from '@/lib/marketing/seo'

export const metadata: Metadata = marketingMetadata({
  title: servicesPage.title,
  description: servicesPage.subheading,
  path: '/services',
  ogTitle: `${servicesPage.title} · Shiloh`,
})

export default function ServicesPage() {
  return (
    <article className="pb-8">
      <StructuredData
        data={[
          serviceCatalogSchema(),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Services', path: '/services' },
          ]),
        ]}
      />
      <header className="mx-auto max-w-3xl px-4 pt-12 text-center sm:px-6 sm:pt-16">
        <p className="font-mono-accent text-brand-600">Capabilities</p>
        <h1 className="font-display mt-4 text-4xl font-normal tracking-tight text-foreground md:text-5xl">
          {servicesPage.heading}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {servicesPage.subheading}
        </p>
      </header>
      {serviceDetails.map((service) => (
        <ServiceSection key={service.id} service={service} />
      ))}
      <CTASection />
    </article>
  )
}
