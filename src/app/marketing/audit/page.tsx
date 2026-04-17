import type { Metadata } from 'next'
import { AuditWizard } from '@/components/marketing/audit/AuditWizard'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'Free AI Audit',
  description:
    'Answer a few questions and get a personalized AI Audit Report for your business — automation opportunities, time savings, and an action plan.',
  openGraph: {
    title: 'Free AI Audit · Shiloh AI',
    description:
      'Guided questionnaire — personalized report in minutes. No credit card.',
    url: `${getMarketingSiteUrl()}/audit`,
    type: 'website',
  },
}

export default function AuditPage() {
  return (
    <article>
      <AuditWizard />
    </article>
  )
}
