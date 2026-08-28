import type { TestimonialItem } from '@/lib/marketing/copy'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

type JsonLd = Record<string, unknown>

export function reviewsJsonLd(
  items: ReadonlyArray<Pick<TestimonialItem, 'quote' | 'reviewAuthorOrg'>>
): JsonLd {
  const url = getMarketingSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@graph': items.map((item) => ({
      '@type': 'Review',
      author: {
        '@type': 'Organization',
        name: item.reviewAuthorOrg ?? 'Client',
      },
      reviewBody: item.quote,
      itemReviewed: {
        '@type': 'Organization',
        name: 'Shiloh',
        url,
      },
    })),
  }
}

export function StructuredData({ data }: { data: JsonLd | JsonLd[] }) {
  const payload = Array.isArray(data) ? data : [data]
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload.length === 1 ? payload[0] : payload),
      }}
    />
  )
}

export function organizationSchema(): JsonLd {
  const url = getMarketingSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Shiloh',
    url,
    description:
      'Engineering-led AI consulting — audit, build, train, and hand off production systems for businesses.',
    sameAs: [] as string[],
  }
}

/** Consulting-first professional service (homepage) */
export function consultingServiceSchema(): JsonLd {
  const url = getMarketingSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Shiloh — AI Consulting',
    url,
    description:
      'Software engineer-led AI consulting: AI readiness audits, RAG systems, workflow automation, voice agents, and fractional AI advisory.',
    areaServed: 'US',
    serviceType: 'AI consulting and implementation',
    priceRange: '$$$',
  }
}

/** ASC healthcare voice agent service (case study page) */
export function ascHealthcareServiceSchema(): JsonLd {
  const url = getMarketingSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Shiloh — ASC Patient Calling',
    url: `${url}/work/surgery-center-voice-agent`,
    description:
      'HIPAA-compliant AI calling agent for independent surgery centers: pre-op confirmation, prep verification, and post-op follow-up.',
    areaServed: 'US',
    serviceType: 'Healthcare patient outreach and AI voice automation',
    audience: {
      '@type': 'Audience',
      audienceType: 'Independent ambulatory surgery centers',
    },
  }
}

export function productSchema(): JsonLd {
  const url = getMarketingSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Shiloh platform',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Contact for enterprise pricing',
    },
    url: `${url}/services`,
    description:
      'Production AI consulting and implementation for businesses — audits, RAG, agents, voice, and advisory.',
  }
}

export function faqPageSchema(
  faqs: ReadonlyArray<{ question: string; answer: string }>
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}
