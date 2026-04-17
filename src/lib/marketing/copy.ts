/**
 * Marketing site copy — single source of truth.
 * Employer branding: Microsoft + Fortune 10 umbrella for prior big-tech work.
 */

import { bookCallUrl } from '@/lib/marketing/site'

export type TestimonialItem = {
  /** Stable key for React / carousel */
  id: string
  quote: string
  attribution: string
  project?: string
  /** Bullet lines shown under Result */
  results?: readonly string[]
  /** True when quote is representative / reconstructed; show small UI label */
  isParaphrase?: boolean
  /** JSON-LD Review author Organization name (omit "team" suffix for cleaner schema) */
  reviewAuthorOrg?: string
}

export const testimonialsHeadline = 'Real results. Real systems. No fluff.'

export const testimonialsSubhead =
  'Verified client feedback and outcomes from production AI engagements.'

export const testimonials: readonly TestimonialItem[] = [
  {
    id: 'cyborg-mobile',
    quote:
      'From day one, Elijah brought genuine passion and focus to our project. As a software engineer on the team, he quickly picked up the technical requirements and took full ownership of the project\'s development. He stood out not just for the quality of his engineering work, but for his thoughtful approach to customer interactions. His contributions made a real impact.',
    attribution: 'Cyborg Mobile team',
    project: 'AI-powered grant writing system for nonprofits',
    results: [
      '10+ hours saved per submission',
      '25%+ increase in grant submission velocity',
      'Expanded capacity without adding staff',
    ],
    isParaphrase: false,
    reviewAuthorOrg: 'Cyborg Mobile',
  },
  {
    id: '223-homebuyers',
    quote:
      'We went from a bloated CRM costing us thousands to a custom system that actually fits how we work — and now AI handles our lead follow-up automatically.',
    attribution: '223 HomeBuyers LLC',
    results: [
      '$500+/mo saved on CRM costs',
      'AI Lead Manager projected to save $1,600/mo and unlock $8K–$50K in additional revenue',
    ],
    isParaphrase: true,
    reviewAuthorOrg: '223 HomeBuyers LLC',
  },
  {
    id: 'surgery-center',
    quote:
      'Nurses were spending hours calling patients before surgery. Now the AI handles it — patients show up prepared, and our team focuses on care instead of phone calls.',
    attribution: 'Surgery center client',
    project: 'Retell AI voice agent for pre-op and post-op patient calls',
    results: [
      'Automated patient outreach',
      'Reduced nurse admin burden',
      'Improved surgery completion rates',
    ],
    isParaphrase: true,
    reviewAuthorOrg: 'Surgery center client',
  },
] as const

export type MetricRow = {
  label: string
  value: string
}

export const metricsBar: readonly MetricRow[] = [
  { label: 'Hours saved per client weekly', value: '10–20+ hrs' },
  { label: 'AI projects delivered', value: '10+' },
  { label: 'Industries served', value: '5+' },
  {
    label: 'Revenue generated for clients',
    value: '$13K+ in a single engagement',
  },
  { label: 'Client cost savings', value: 'Up to $2,100/mo per client' },
  {
    label: 'Founder background',
    value: 'Ex-Microsoft SDE · Fortune 10 tech background',
  },
] as const

export type CredibilityBadge = {
  title: string
  description: string
}

export const credibilityBadges: readonly CredibilityBadge[] = [
  {
    title: 'Fortune 10 SDE experience',
    description:
      'Former software engineer at Microsoft and a Fortune 10 technology company — not a freelancer who watched a YouTube tutorial.',
  },
  {
    title: 'Ex-Microsoft SDE',
    description:
      'Shipped AI features in Microsoft Teams at scale — real-time audio quality monitoring in production.',
  },
  {
    title: '10+ AI projects delivered',
    description:
      'Across real estate, healthcare, nonprofits, finance, education, and more.',
  },
  {
    title: '$10K+ in AI consulting revenue',
    description:
      'Delivered while working full-time in engineering at a Fortune 10 technology company.',
  },
  {
    title: 'Production-grade code',
    description: 'Custom Python and integrations — not Zapier-only automations.',
  },
] as const

/** Long-form About page — paragraphs and bullet sections */
export const founderAbout = {
  title: 'Elijah — Founder, Shiloh AI',
  lead:
    'Software engineer. Former Microsoft SDE. Former SDE at a Fortune 10 technology company. 3+ years building AI systems in production.',
  microsoft:
    'At Microsoft, Elijah implemented AI into Microsoft Teams — building real-time audio quality monitoring features used at scale.',
  fortune10:
    'At a Fortune 10 technology company, he ran an internal AI audit: interviewed product managers, compiled research, presented to senior engineers, and built the POC and roadmap for AI implementation.',
  sideProjectsIntro:
    'On the side, he started building AI systems for businesses — and the results spoke for themselves:',
  bullets: [
    'Built an AI grant-writing system that cut 10+ hours per submission and increased submission velocity by 25%+ for a nonprofit',
    'Migrated a wholesale real estate client off an expensive CRM, saving $500+/mo, then built an AI Lead Manager projected to save $1,600/mo and generate $8K–$50K in new revenue',
    'Built AI voice agents for surgery centers that automated patient outreach and freed nurses from hours of phone calls',
    'Created RAG chatbots for education, finance, and coaching — turning static content into interactive AI experiences',
    'Generated $13K+ in revenue for a single client in one engagement',
  ],
  closing:
    'After seeing the same pattern — businesses drowning in tools that do not talk to each other, losing leads, wasting hours on work AI should handle — he built Shiloh AI to fix it. Not another slide deck. An AI consulting practice that ships production systems: tailored deployments of our platform, or custom integrations into the stack you already run.',
} as const

/** Home hero — static text; CTAs from heroCtas() */
export const heroCopy = {
  badge: 'AI consulting',
  title: 'AI consulting that actually ships',
  subtitle:
    'From audit to roadmap to production — we deploy AI that fits your ops, your data, and your risk profile. Start from our platform or plug agents into the tools you already use.',
} as const

export function heroCtas(): {
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
} {
  return {
    primaryCta: { label: 'Book a strategy call', href: bookCallUrl() },
    secondaryCta: { label: 'Get a free AI audit', href: '/audit' },
  }
}

export type ValuePropId =
  | 'platform'
  | 'custom'
  | 'integrations'
  | 'guardrails'
  | 'engineering'
  | 'roi'

export const valuePropsSection = {
  heading: 'What you get with Shiloh AI',
  subheading:
    'Consulting outcomes backed by a real production platform — not generic prompts or one-off Zaps.',
  items: [
    {
      id: 'platform' as const,
      title: 'Platform head-start',
      body:
        'Start from our production platform — unified inbox, agents, workflows, and CRM sync — not a blank repo.',
    },
    {
      id: 'custom' as const,
      title: 'Custom builds when you need them',
      body:
        'Python, LLMs, RAG, voice — engineered for your edge cases, not Zapier-only glue.',
    },
    {
      id: 'integrations' as const,
      title: 'Integrates with your stack',
      body:
        'HubSpot, Salesforce, Follow Up Boss, Gmail, Slack, Twilio, Retell, and more — we meet you where your data lives.',
    },
    {
      id: 'guardrails' as const,
      title: 'Agents with guardrails',
      body:
        'Approvals, logging, and audit trails — built for how SMBs and ops teams actually run.',
    },
    {
      id: 'engineering' as const,
      title: 'Production engineering',
      body:
        'Ex-Microsoft shipping standards — the same bar we use for client systems.',
    },
    {
      id: 'roi' as const,
      title: 'Measurable ROI',
      body:
        'Hours saved, revenue added, cost cut — we scope what success looks like before we build.',
    },
  ] as const,
}

export const engagementsCatalog = {
  badge: 'Engagements',
  heading: 'Ways to work together',
  subheading:
    'Every engagement picks the pieces you need — we do not force-fit the whole platform.',
  items: [
    {
      name: 'AI Audit & Roadmap',
      blurb:
        'Fixed-scope discovery: where AI moves your P&L, what to build first, and whether to lead with our platform or integrations into your stack.',
    },
    {
      name: 'Tailored platform deployment',
      blurb:
        'We deploy the Shiloh platform — branded and configured for your workflows, data model, and channels.',
    },
    {
      name: 'Custom integrations',
      blurb:
        'AI agents and automations that slot into your existing CRM, inbox, and calendar — no migration required.',
    },
    {
      name: 'Ongoing AI partner',
      blurb:
        'Fractional retainer: ship iterations, monitor quality, and expand use cases as your business changes.',
    },
  ] as const,
}

export const deliveryModelsSection = {
  heading: 'Two ways we deliver',
  subheading:
    'Same consulting rigor — choose the model that fits your stack and timeline.',
  footer:
    'Not sure which fits? The free AI audit tells you.',
  models: [
    {
      id: 'platform' as const,
      title: 'Start from our platform',
      body:
        'We deploy the Shiloh platform — unified inbox, agents, workflows, voice, and CRM sync — and tailor it to your brand, data, and process. Best when you want one intelligence layer or are ready to consolidate tools.',
    },
    {
      id: 'integrate' as const,
      title: 'Integrate into your existing stack',
      body:
        'We build custom AI agents and automations inside HubSpot, Salesforce, Follow Up Boss, Gmail, Slack, Twilio, and more. Best when your stack works and you need the AI layer without a rip-and-replace.',
    },
  ] as const,
}

export const platformCapabilitiesSection = {
  badge: 'Shiloh platform',
  heading: 'What ships out of the box',
  subheading:
    'When you deploy with us, you inherit production-grade building blocks — tailored to what you actually need.',
  items: [
    {
      title: 'Unified multichannel inbox',
      body: 'Email, SMS, DMs, and voice in one queue with AI triage.',
    },
    {
      title: 'Agent runtime',
      body: 'Policy-bound actions with human approval where you want it.',
    },
    {
      title: 'Workflow engine',
      body: 'Automations, scheduled jobs, and handoffs between agents and people.',
    },
    {
      title: 'AI voice',
      body: 'Inbound and outbound patterns — qualify, answer FAQs, book appointments.',
    },
    {
      title: 'CRM sync & data model',
      body: 'Keep fields, tasks, and pipeline hygiene aligned with conversations.',
    },
    {
      title: 'Secure integrations',
      body: 'OAuth connections and audit-friendly logging for production use.',
    },
  ] as const,
}

export const integrationTargets: readonly string[] = [
  'HubSpot',
  'Salesforce',
  'Follow Up Boss',
  'Gmail',
  'Slack',
  'Twilio',
  'Retell',
  'Google Calendar',
  'Microsoft 365',
]

export const industriesList: readonly {
  slug: string
  label: string
  description: string
  proof?: string
}[] = [
  {
    slug: 'real-estate',
    label: 'Real estate',
    description:
      'Lead qualification, reactivation, and multichannel follow-up for brokerages and investors.',
    proof: 'Wholesale client: CRM savings + AI lead manager ROI',
  },
  {
    slug: 'healthcare',
    label: 'Healthcare',
    description:
      'Voice and messaging workflows that reduce admin burden and keep patients on track.',
    proof: 'Surgery center: automated pre/post-op outreach',
  },
  {
    slug: 'nonprofits',
    label: 'Nonprofits',
    description:
      'Grant writing and donor-facing AI that scales capacity without adding headcount.',
    proof: 'Nonprofit: 10+ hours saved per grant submission',
  },
  {
    slug: 'finance',
    label: 'Finance',
    description:
      'RAG and advisory assistants that turn policies and content into reliable answers.',
    proof: 'Coaching & finance chatbots from static content',
  },
  {
    slug: 'education',
    label: 'Education',
    description:
      'Interactive learning experiences and support bots grounded in your curriculum.',
    proof: 'Education RAG deployments',
  },
  {
    slug: 'professional-services',
    label: 'Professional services',
    description:
      'Ops automation and client-facing agents for firms that live in email and CRM.',
    proof: 'Cross-industry automation and integrations',
  },
] as const

export const processStepsSection = {
  heading: 'How engagements run',
  subheading: 'Clear phases — no black box.',
  steps: [
    {
      step: 1,
      title: 'Audit',
      body: 'Map workflows, data, risk, and ROI — platform vs. integrations.',
    },
    {
      step: 2,
      title: 'Design',
      body: 'Architecture, guardrails, integrations, and success metrics.',
    },
    {
      step: 3,
      title: 'Build',
      body: 'Ship to staging, test with real users, harden for production.',
    },
    {
      step: 4,
      title: 'Operate',
      body: 'Monitor quality, iterate, and expand use cases with your team.',
    },
  ] as const,
}

export const ctaCopy = {
  heading: 'Let’s figure out where AI actually pays off for your business',
  subheading:
    'Get a free AI audit — personalized opportunities, time savings, and a clear action plan.',
  primaryLabel: 'Get your free AI audit',
  secondaryLabel: 'Book a strategy call',
} as const
