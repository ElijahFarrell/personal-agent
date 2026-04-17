import type { TestimonialItem } from '@/lib/marketing/copy'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

type JsonLd = Record<string, unknown>

/**
 * Emits Review JSON-LD for GEO / rich results (author, reviewBody, itemReviewed).
 * Omits reviewRating — add only if you want to assert a numeric score.
 */
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
        name: 'Shiloh AI',
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
    name: 'Shiloh AI',
    url,
    description:
      'AI consulting for SMBs, founders, and ops leaders — production AI systems, tailored platform deployments, and custom integrations into existing tools.',
    sameAs: [] as string[],
  }
}

/** Consulting / professional services framing for the marketing home page */
export function professionalServiceSchema(): JsonLd {
  const url = getMarketingSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Shiloh AI',
    url,
    description:
      'AI consulting engagements: audits, tailored platform deployment, custom integrations, and ongoing fractional AI partnership for growing businesses.',
    areaServed: 'US',
    serviceType: 'Artificial intelligence consulting and implementation',
  }
}

export function productSchema(): JsonLd {
  const url = getMarketingSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Shiloh AI platform',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Contact for enterprise pricing',
    },
    url: `${url}/real-estate`,
    description:
      'Production AI platform for real estate engagements: lead qualification, reactivation, unified inbox, workflows, and voice agents — deployed or integrated via consulting.',
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
