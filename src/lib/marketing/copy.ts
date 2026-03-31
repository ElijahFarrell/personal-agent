/**
 * Marketing site copy — single source of truth.
 * Employer branding: Microsoft + Fortune 10 umbrella for prior big-tech work.
 */

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
    id: 'nonprofit-client',
    quote:
      'From day one, Elijah brought genuine passion and focus to our project. As a software engineer on the team, he quickly picked up the technical requirements and took full ownership of the project\'s development. He stood out not just for the quality of his engineering work, but for his thoughtful approach to customer interactions. His contributions made a real impact.',
    attribution: 'Nonprofit client team',
    project: 'AI-powered grant writing system for nonprofits',
    results: [
      '10+ hours saved per submission',
      '25%+ increase in grant submission velocity',
      'Expanded capacity without adding staff',
    ],
    isParaphrase: false,
    reviewAuthorOrg: 'Nonprofit client',
  },
  {
    id: 'wholesale-real-estate-client',
    quote:
      'We went from a bloated CRM costing us thousands to a custom system that actually fits how we work — and now AI handles our lead follow-up automatically.',
    attribution: 'Wholesale real estate client',
    results: [
      '$500+/mo saved on CRM costs',
      'AI Lead Manager projected to save $1,600/mo and unlock $8K–$50K in additional revenue',
    ],
    isParaphrase: true,
    reviewAuthorOrg: 'Wholesale real estate client',
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
    description: 'Across real estate, healthcare, nonprofits, finance, education, and more.',
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
    'After seeing the same pattern — businesses drowning in tools that do not talk to each other, losing leads, wasting hours on work AI should handle — he built Shiloh AI to fix it. Not another SaaS dashboard. An AI Operating System that actually does the work.',
} as const
