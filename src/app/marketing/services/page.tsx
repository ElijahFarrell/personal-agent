import type { Metadata } from 'next'
import { ServiceSection } from '@/components/marketing/consulting/ServiceSection'
import { CTASection } from '@/components/marketing/CTASection'
import { serviceDetails, servicesPage } from '@/lib/marketing/consulting-copy'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: servicesPage.title,
  description: servicesPage.subheading,
  openGraph: {
    title: `${servicesPage.title} · Shiloh AI`,
    url: `${getMarketingSiteUrl()}/services`,
  },
}

export default function ServicesPage() {
  return (
    <article className="pb-8">
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
