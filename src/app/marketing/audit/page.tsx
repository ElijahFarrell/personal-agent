import type { Metadata } from 'next'
import { AuditWizard } from '@/components/marketing/audit/AuditWizard'
import { ConversionPath } from '@/components/marketing/consulting/ConversionPath'
import { FreeVsPaid } from '@/components/marketing/consulting/FreeVsPaid'
import { FAQSection } from '@/components/marketing/FAQSection'
import {
  breadcrumbSchema,
  faqPageSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { auditFaq } from '@/lib/marketing/consulting-copy'
import { marketingMetadata } from '@/lib/marketing/seo'

export const metadata: Metadata = marketingMetadata({
  title: 'Free AI Audit',
  description:
    'Five-minute diagnostic report of AI opportunities. Then choose no build, a 15-minute fit call, or a paid AI Readiness Audit.',
  path: '/audit',
  ogTitle: 'Free AI Audit · Shiloh',
})

export default function AuditPage() {
  return (
    <>
      <StructuredData
        data={[
          faqPageSchema(auditFaq),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Free AI Audit', path: '/audit' },
          ]),
        ]}
      />
      <article>
        <AuditWizard />
        <ConversionPath />
        <FreeVsPaid />
        <FAQSection
          id="audit-faq-heading"
          title="Before you start"
          items={auditFaq}
        />
      </article>
    </>
  )
}
