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
      'Production AI agency and AI OS platform for real estate teams — lead qualification, multichannel outreach, and secure automation.',
    sameAs: [] as string[],
  }
}

export function productSchema(): JsonLd {
  const url = getMarketingSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Shiloh AI OS',
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
      'AI operating system for real estate: lead qualification, reactivation, unified inbox, workflows, and voice agents.',
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
