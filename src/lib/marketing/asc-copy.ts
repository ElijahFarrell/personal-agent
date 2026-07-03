/**
 * ASC pre-op/post-op calling agent — marketing copy.
 * Structured for high-converting B2B healthcare landing page (Notion ASC playbook).
 */

import { bookCallUrl } from '@/lib/marketing/site'

export const ascHero = {
  badge: 'For independent surgery centers',
  title: 'Stop losing surgical cases to no-shows and same-day cancellations',
  subtitle:
    'A HIPAA-compliant calling agent phones every patient before surgery to confirm they\u2019re coming and verify prep\u00a0\u2014 then follows up after. You keep the revenue you were losing.',
  trustStrip: [
    'HIPAA-compliant',
    'Signed BAA',
    'Built by an AI engineer (Amazon, ex-Microsoft)',
  ] as const,
  primaryCta: { label: 'Book a 15-minute call', href: bookCallUrl() },
  secondaryCta: { label: 'Hear a sample call', href: '#sample-call' },
  footnote: 'No PHI on this site \u00b7 Business contact only \u00b7 15\u00a0min',
} as const

export const revenueMath = {
  heading: 'The math your administrator already knows',
  intro:
    'Most ASCs run 30\u201350 cases per week. Even a modest cancellation rate erases six figures fast.',
  scenario: {
    casesPerWeek: 40,
    avgCaseValue: 4_000,
    cancellationRate: 0.2,
    lostCasesPerWeek: 8,
  },
  highlight: {
    label: 'Recover just 2 cases per week',
    value: '$32,000',
    period: 'kept per month',
  },
  footnote:
    'Illustrative based on typical independent ASC volume. Your baseline is measured during the pilot.',
} as const

export const audienceSection = {
  heading: 'Built for independent, physician-owned ASCs',
  subheading:
    'Single-site centers where every cancelled case hits the bottom line\u00a0\u2014 not enterprise health systems with overflow capacity.',
  specialties: [
    'Orthopedics',
    'Spine',
    'Pain management',
    'Cardiovascular',
    'GI / Endoscopy',
    'Ophthalmology',
  ] as const,
  stakeholders: [
    {
      role: 'Administrator / Owner',
      concern: 'Revenue & ROI',
      outcome: 'Fewer lost cases means protected margin without adding staff.',
    },
    {
      role: 'Nursing lead',
      concern: 'Staff burden',
      outcome: 'Hours of pre-op phone tag removed from your team\u2019s day.',
    },
    {
      role: 'Clinical lead',
      concern: 'Patient safety',
      outcome: 'Prep failures caught the night before\u00a0\u2014 NPO, bowel prep, medication holds.',
    },
  ] as const,
} as const

export const howItWorks = {
  heading: 'How it works',
  subheading: 'Baseline, build, go live\u00a0\u2014 then measure recovered cases against your 90-day history.',
  steps: [
    {
      step: 1,
      title: 'Baseline & build',
      body: 'Sign the BAA. We map your prep scripts to specialty, connect to your schedule, and establish your 90-day cancellation baseline.',
    },
    {
      step: 2,
      title: 'Go live',
      body: 'Pre-op confirmation calls run automatically. Post-op follow-ups catch issues early. Weekly tuning keeps scripts sharp.',
    },
    {
      step: 3,
      title: 'Readout',
      body: 'Compare recovered cases vs. baseline. You see the numbers\u00a0\u2014 not a vanity dashboard.',
    },
  ] as const,
} as const

export const benefitsSection = {
  heading: 'Three outcomes that matter',
  subheading: 'We sell recovered cases and calmer nurses\u00a0\u2014 not \u201can AI phone agent.\u201d',
  items: [
    {
      title: 'Fewer no-shows & cancellations',
      body: 'Voice confirmation the day before catches patients who would have ghosted\u00a0\u2014 and gives you time to backfill.',
      stakeholder: 'Owner / Administrator',
    },
    {
      title: 'Prep failures caught early',
      body: 'NPO violations, missed bowel prep, and medication issues surfaced before the patient shows up unprepared.',
      stakeholder: 'Clinical lead',
    },
    {
      title: 'Calmer nursing staff',
      body: 'Your nurses stop spending hours on repetitive phone calls and focus on patients in the building.',
      stakeholder: 'Nursing lead',
    },
  ] as const,
} as const

export type AscTestimonial = {
  id: string
  quote: string
  attribution: string
  context?: string
  results?: readonly string[]
  isParaphrase?: boolean
}

export const proofSection = {
  heading: 'Proof, not promises',
  subheading:
    'Production voice agents already running in healthcare\u00a0\u2014 plus a broader track record shipping AI that moves P&L.',
  testimonials: [
    {
      id: 'surgery-center',
      quote:
        'Nurses were spending hours calling patients before surgery. Now the AI handles it\u00a0\u2014 patients show up prepared, and our team focuses on care instead of phone calls.',
      attribution: 'Surgery center client',
      context: 'Pre-op & post-op voice agent',
      results: [
        'Automated patient outreach',
        'Reduced nurse admin burden',
        'Improved surgery completion rates',
      ],
      isParaphrase: true,
    },
  ] as const satisfies readonly AscTestimonial[],
  trackRecord: [
    { label: 'AI consulting revenue delivered', value: '$10K+' },
    { label: 'Grant-writing automation', value: '10+ hrs saved per submission' },
    { label: 'Voice reactivation agents', value: 'Production deployments' },
  ] as const,
} as const

export const guaranteeSection = {
  heading: 'Risk reversal',
  body: 'If we don\u2019t lower your cancellation/no-show rate below your 90-day baseline during the pilot, we refund the setup fee. You keep all recovered revenue either way.',
  badge: 'Performance-backed pilot',
} as const

export const pricingSection = {
  heading: 'Pilot pricing',
  subheading: 'Anchored to the value of a recovered case\u00a0\u2014 not per-seat software.',
  tiers: [
    {
      name: 'Pilot setup',
      price: '$2,000',
      detail: 'One-time setup, credited toward ongoing if you continue',
      features: [
        'BAA & compliance setup',
        'Specialty-specific call scripts',
        '90-day baseline measurement',
        'Pre-op + post-op call flows',
      ],
    },
    {
      name: 'Ongoing',
      price: '$1,500\u2013$5,000',
      period: '/mo',
      detail: 'Based on case volume and call complexity',
      features: [
        'Unlimited pre-op confirmation calls',
        'Post-op follow-up sequences',
        'Weekly script tuning',
        'Recovered-case reporting',
      ],
      highlighted: true,
    },
  ] as const,
  footnote: 'Exact pricing confirmed on your discovery call. No surprise fees.',
} as const

export const ascFaq = [
  {
    question: 'Is this HIPAA-compliant?',
    answer:
      'Yes. We sign a Business Associate Agreement (BAA) before any patient data flows. Calls are encrypted in transit (TLS\u00a01.2+) and at rest (AES-256). This marketing site collects business contact info only\u00a0\u2014 never PHI.',
  },
  {
    question: 'How is this different from texting platforms?',
    answer:
      'Text can\u2019t verify prep verbally, triage concerns, or escalate to a nurse in real time. Voice confirms the patient understands NPO instructions, catches confusion, and documents the outcome\u00a0\u2014 things a SMS blast cannot do.',
  },
  {
    question: 'What do you need from us to get started?',
    answer:
      'Schedule access (or a daily export), your prep instruction sheets by specialty, and 90 days of cancellation/no-show history for baseline. We handle script writing, call flows, and compliance paperwork.',
  },
  {
    question: 'Who built this?',
    answer:
      'Shiloh AI is led by engineers with production AI experience at Microsoft (Teams audio quality) and a Fortune\u00a010 technology company. Healthcare voice agents are built to the same shipping standard as enterprise software.',
  },
  {
    question: 'What happens on the 15-minute discovery call?',
    answer:
      'We walk through your case volume, current cancellation rate, and prep workflow. You\u2019ll hear how the agent handles a real pre-op call. If there\u2019s a fit, we scope a pilot with clear success metrics.',
  },
] as const

export const finalCta = {
  heading: 'See if recovered cases pencil out for your center',
  subheading:
    '15 minutes. No obligation. We\u2019ll run the math on your volume and show you a sample call.',
  primaryLabel: 'Book a 15-minute call',
  secondaryLabel: 'Hear a sample call',
} as const

export const siteMeta = {
  title: 'Shiloh AI \u2014 Recover surgical cases your ASC is losing to no-shows',
  description:
    'HIPAA-compliant pre-op and post-op calling agent for independent surgery centers. Confirm patients, verify prep, and keep revenue you were losing to cancellations.',
} as const
