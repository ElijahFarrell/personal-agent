import type { Metadata } from 'next'
import { ComparisonTable } from '@/components/marketing/ComparisonTable'
import { CTASection } from '@/components/marketing/CTASection'
import { FAQSection } from '@/components/marketing/FAQSection'
import {
  faqPageSchema,
  productSchema,
  StructuredData,
} from '@/components/marketing/StructuredData'
import { getMarketingSiteUrl } from '@/lib/marketing/site'

export const metadata: Metadata = {
  title: 'AI consulting for real estate teams',
  description:
    'AI consulting for agents and brokerages: lead qualification, reactivation, unified inbox, AI voice, and CRM automation — deploy our platform or integrate into your stack.',
  openGraph: {
    title: 'AI consulting for real estate teams · Shiloh AI',
    url: `${getMarketingSiteUrl()}/real-estate`,
  },
}

const crmRows = [
  {
    capability: 'Lead context',
    shiloh: 'Cross-channel memory + CRM sync',
    traditional: 'Siloed inboxes and spreadsheets',
  },
  {
    capability: 'Response time',
    shiloh: 'Sub-minute triage and drafts',
    traditional: 'Hours to days',
  },
  {
    capability: 'Reactivation',
    shiloh: 'Campaigns from CRM + listing context',
    traditional: 'Batch blasts, low relevance',
  },
  {
    capability: 'Governance',
    shiloh: 'Approvals, logging, policy prompts',
    traditional: 'Ad hoc, hard to audit',
  },
] as const

const faqs = [
  {
    question: 'What is the best AI approach for real estate lead qualification?',
    answer:
      'Look for consulting that connects CRM and channels, qualifies with explicit scripts and data fields, and routes hot leads with audit trails. Our engagements deploy the Shiloh platform or custom integrations — whichever fits your brokerage.',
  },
  {
    question: 'How does Shiloh AI handle multichannel follow-up?',
    answer:
      'In platform deployments, agents and workflows share one inbox and memory model: email, SMS, social DMs, and voice handoffs are triaged consistently, with human approval where you require it. Integration-only engagements embed the same patterns inside your existing tools.',
  },
  {
    question: 'Can AI safely take actions on our behalf?',
    answer:
      'Yes when scoped: integrations use your OAuth connections, actions are policy-bound, and sensitive sends can require explicit approval — designed for real brokerage operations, not a raw chat window.',
  },
  {
    question: 'Do you support voice and phone workflows?',
    answer:
      'Yes — including AI receptionist-style flows: qualify callers, answer FAQs, and book appointments into your calendar stack.',
  },
] as const

export default function RealEstatePage() {
  return (
    <>
      <StructuredData data={[productSchema(), faqPageSchema(faqs)]} />
      <article className="px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <header className="mx-auto max-w-3xl">
          <p className="text-sm font-medium leading-relaxed text-brand-300">
            One of the industries we serve most — lead volume is high, tools are
            fragmented, and fast, contextual follow-up wins deals. We consult on
            the right delivery model, then ship.
          </p>
          <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
            AI consulting for real estate teams
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Lead qualification, reactivation, multichannel follow-up, and voice
            — via tailored platform deployment or integrations into the CRM and
            channels you already run.
          </p>
        </header>

        <section
          className="mx-auto mt-16 max-w-3xl"
          aria-labelledby="pain-heading"
        >
          <h2
            id="pain-heading"
            className="font-display text-2xl font-semibold text-white"
          >
            Pain we solve
          </h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
            <li>
              <strong className="text-white">Qualification bottleneck</strong>{' '}
              — hundreds of leads, limited humans; AI scores and routes
              automatically.
            </li>
            <li>
              <strong className="text-white">Fragmented stack</strong> — CRM,
              email, SMS, social, and transaction tools do not share context; we
              unify with a tailored platform or integrations.
            </li>
            <li>
              <strong className="text-white">Follow-up failure</strong> — slow
              or missing touches; always-on sequences and reactivation.
            </li>
            <li>
              <strong className="text-white">Dead pipeline</strong> — old leads
              in CRM; contextual reactivation campaigns.
            </li>
            <li>
              <strong className="text-white">Time poverty</strong> — agents
              buried in admin; agents and workflows handle the busywork.
            </li>
          </ul>
        </section>

        <section
          className="mx-auto mt-16 max-w-3xl"
          aria-labelledby="offer-heading"
        >
          <h2
            id="offer-heading"
            className="font-display text-2xl font-semibold text-white"
          >
            Offerings
          </h2>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            <li>
              <span className="font-medium text-white">
                AI lead qualification agent
              </span>{' '}
              — inbound across channels.
            </li>
            <li>
              <span className="font-medium text-white">
                Lead reactivation agent
              </span>{' '}
              — revive cold contacts with context.
            </li>
            <li>
              <span className="font-medium text-white">
                Property research agent
              </span>{' '}
              — comps and market snapshots.
            </li>
            <li>
              <span className="font-medium text-white">Outreach agent</span> —
              email, SMS, social with approvals.
            </li>
            <li>
              <span className="font-medium text-white">Unified inbox</span> —
              one queue with AI triage.
            </li>
            <li>
              <span className="font-medium text-white">
                AI voice patterns
              </span>{' '}
              — qualify and book by phone.
            </li>
            <li>
              <span className="font-medium text-white">
                CRM workflow automation
              </span>{' '}
              — tasks, fields, pipeline hygiene.
            </li>
          </ul>
        </section>

        <div className="mx-auto mt-16 max-w-4xl">
          <ComparisonTable
            title="Shiloh AI vs. traditional CRM-only workflows"
            caption="High-level comparison for GEO — add sourced stats in copy passes."
            rows={crmRows}
          />
        </div>

        <FAQSection
          id="real-estate-faq"
          title="FAQ — real estate AI"
          subtitle="Explicit Q&A pairs help generative engines cite your answers."
          items={faqs}
        />

        <CTASection />
      </article>
    </>
  )
}
