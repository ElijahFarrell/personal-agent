/**
 * Consulting-first marketing copy — single source of truth for the redesigned site.
 */

import { bookCallUrl } from '@/lib/marketing/site'

export const siteMeta = {
  title: 'Shiloh — Engineering-led AI consulting',
  description:
    'Software engineer (Amazon, Microsoft) who helps businesses find and implement high-ROI AI workflows — from audit to production. Fixed-fee engagements.',
} as const

export const heroCopy = {
  eyebrow: 'AI CONSULTING — AUDIT → BUILD → TRAIN',
  title: 'Find out where AI actually saves your business time and money.',
  subtitle:
    'Take the free AI audit: answer a few questions about how your team works, get a personalized report of your highest-ROI automation opportunities — then, if it makes sense, Shiloh builds it with you.',
  trustLine:
    'Software engineer at Amazon, ex-Microsoft · systems shipped across nonprofits, real estate, education & finance',
  footnote: '~5 minutes · No credit card · Report in your inbox',
} as const

export function heroCtas(): {
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
} {
  return {
    primaryCta: { label: 'Start the free AI audit', href: '/audit' },
    secondaryCta: { label: 'Book a strategy call', href: bookCallUrl() },
  }
}

export type OutcomeMetric = {
  value: string
  label: string
  href: string
}

export const outcomeMetrics: readonly OutcomeMetric[] = [
  {
    value: '10+ hrs',
    label: 'saved per grant submission',
    href: '/work/grant-writing-automation',
  },
  {
    value: '~$13K/mo',
    label: 'added client revenue',
    href: '/work/grant-writing-automation',
  },
  {
    value: '25%',
    label: 'more grant submissions per month',
    href: '/work/grant-writing-automation',
  },
  {
    value: '$500+/mo',
    label: 'cut from a client\u2019s CRM spend',
    href: '/work/real-estate-crm-and-voice',
  },
] as const

export const outcomesCaption =
  'Real numbers from shipped client systems — details in the case studies.'

export const engagementSteps = {
  heading: 'How engagements run',
  subheading: 'Start with clarity. Ship when the ROI is obvious.',
  steps: [
    {
      step: '01',
      title: 'Audit',
      duration: '1–2 weeks',
      body: 'We map your workflows and find the highest-ROI opportunity. You get a prioritized roadmap with honest build-vs-buy calls — even if the answer is \u201cdon\u2019t build anything yet.\u201d',
    },
    {
      step: '02',
      title: 'Build',
      duration: '4–8 weeks',
      body: 'Fixed-fee implementation of one system, integrated with your stack. You see working software weekly, not a deck at the end.',
    },
    {
      step: '03',
      title: 'Train & hand off',
      duration: 'Ongoing optional',
      body: 'Your team learns to run it. Optional advisory retainer if you want a fractional AI lead on call.',
    },
  ] as const,
} as const

export type CapabilityOffer = {
  id: string
  tag: string
  title: string
  outcome: string
  href: string
}

export const capabilityOffers: readonly CapabilityOffer[] = [
  {
    id: 'audit',
    tag: 'AUDIT',
    title: 'AI Readiness Audit',
    outcome: 'Prioritized roadmap with ROI estimates before you commit to a build.',
    href: '/services#audit',
  },
  {
    id: 'rag',
    tag: 'RAG',
    title: 'Knowledge Base / RAG',
    outcome: 'Turn documents, recordings, and slides into a queryable AI assistant.',
    href: '/services#rag',
  },
  {
    id: 'agents',
    tag: 'AGENTS',
    title: 'Workflow Automation',
    outcome: 'Multi-step agents that draft, route, update CRM, and generate content.',
    href: '/services#agents',
  },
  {
    id: 'voice',
    tag: 'VOICE',
    title: 'Voice AI Agents',
    outcome: 'Inbound and outbound calling agents for lead reactivation and patient outreach.',
    href: '/services#voice',
  },
  {
    id: 'advisory',
    tag: 'ADVISORY',
    title: 'Fractional AI Lead',
    outcome: 'Monthly check-ins, tool evaluation, and iteration on existing systems.',
    href: '/services#advisory',
  },
] as const

export const featuredCaseStudy = {
  clientType: 'Nonprofit · Grant writing',
  headline: 'From 10+ hours per grant to a scalable submission pipeline',
  problem:
    'Grant writers were drowning in 50+ page documents — manual research, repetitive drafting, and slow turnaround limited how many grants the team could submit each month.',
  solution:
    'Built an agentic RAG pipeline: ingest long documents, answer direct questions, auto-generate first-draft narratives from up-to-date org info, and keep the knowledge base current.',
  metrics: [
    { value: '10+ hrs', label: 'saved per submission' },
    { value: '25%', label: 'more submissions' },
    { value: '~$13K/mo', label: 'revenue lift' },
  ] as const,
  testimonial: {
    quote:
      'From day one, the engineering lead brought genuine passion and focus to our project. They quickly picked up the technical requirements and took full ownership of the project\u2019s development — standing out for quality of work and thoughtful customer interactions.',
    attribution: 'Nonprofit client team',
  },
  slug: 'grant-writing-automation',
} as const

export const editorialTestimonial = {
  quote:
    'From day one, the engineering lead brought genuine passion and focus to our project. They quickly picked up the technical requirements and took full ownership of the project\u2019s development — standing out for quality of work, thoughtful customer interactions, and real impact on our client\u2019s outcomes.',
  attribution: 'Nonprofit client team',
  project: 'AI-powered grant writing system for nonprofits',
} as const

export const founderHome = {
  name: 'Shiloh',
  role: 'Engineering-led AI consulting',
  bio: 'Shiloh is built by engineers from Amazon and Microsoft who ship production ML in enterprise and client systems. We audit workflows, build production AI, train your team, and hand off — across nonprofits, real estate, education, and financial services. No strategy decks.',
  tags: ['AMAZON', 'MICROSOFT', '10+ SYSTEMS SHIPPED'] as const,
} as const

export const founderAbout = {
  title: 'About Shiloh',
  lead: 'Engineering-led AI consulting from a team with Amazon and Microsoft backgrounds — we help businesses ship production AI, not slide decks.',
  story: [
    'Shiloh started from the same builder mindset that powers big-tech engineering: ship real systems, measure outcomes, and hand off something your team can run.',
    'Our team has shipped AI into Microsoft Teams — real-time audio quality monitoring at production scale — and run internal AI audits at a Fortune 10 company: stakeholder interviews, prioritized roadmaps, and working POCs.',
    'On client engagements, Shiloh has built grant automation that cut 10+ hours per submission, CRM migrations that saved $500+/month, voice agents that reactivate dormant leads, and RAG tutors that give students 24/7 access to course material.',
  ],
  philosophy:
    'Consulting-first: we find the highest-ROI workflow, build the system, and train your team to run it. Fixed-fee engagements. Production systems, not pilots that die.',
  values: [
    'Honest scoping — sometimes the answer is don\u2019t build anything yet',
    'Fixed fees — you\u2019ll never get an hourly surprise',
    'Production code — engineered systems, not Zapier-only glue',
    'Your team runs it — training and handoff are part of every build',
  ] as const,
} as const

export type FaqItem = { question: string; answer: string }

export const homeFaq: readonly FaqItem[] = [
  {
    question: 'What does the audit actually include?',
    answer:
      'A guided questionnaire about your workflows, tools, and pain points — followed by a personalized report with your top automation opportunities, estimated time savings, and a prioritized action plan. It takes about 5 minutes and costs nothing.',
  },
  {
    question: 'Do you only work with one industry?',
    answer:
      'No. Shiloh sells by capability, not vertical. We\u2019ve shipped systems for nonprofits, real estate, education, financial services, healthcare, and enterprise teams. The audit is the same everywhere; the build fits your business.',
  },
  {
    question: 'What if we already tried AI and it flopped?',
    answer:
      'Common story. Most failed AI projects picked the wrong workflow, the wrong approach (RAG vs fine-tune vs agent), or never made it past a demo. The audit exists to find the one workflow where AI actually pays off — before you spend on another build.',
  },
  {
    question: 'How are you different from an automation agency?',
    answer:
      'Shiloh is engineering-led (Amazon, Microsoft backgrounds), not a no-code agency. We audit first, recommend honestly, then build production systems with proper architecture — and train your team to run them. Fixed-fee, not hourly billing.',
  },
  {
    question: 'What do you need from us to start?',
    answer:
      'For the free audit: 5 minutes and honest answers about how your team works. For a paid engagement: access to stakeholders for interviews, your existing tools/stack, and sample workflows or documents.',
  },
  {
    question: 'Do you work fixed-fee or hourly?',
    answer:
      'Fixed fees, always. An AI Readiness Audit is $2,500–$5,000. Implementations range from $5,000–$25,000 depending on scope. You\u2019ll get a clear quote before any work begins.',
  },
] as const

export const ctaCopy = {
  heading: 'Find your highest-ROI AI opportunity.',
  subheading:
    'Take the free audit — personalized opportunities, estimated time savings, and a clear action plan in your inbox.',
  primaryLabel: 'Start the free AI audit',
  secondaryLabel: 'Book a 15-minute strategy call',
} as const

export const servicesPage = {
  title: 'Services',
  heading: 'Sold by capability, not by industry',
  subheading:
    'The audit is the same everywhere — the build fits your business. Every engagement starts with understanding your workflows, then shipping production systems with fixed fees.',
} as const

export type ServiceDetail = {
  id: string
  title: string
  whoFor: string
  delivered: readonly string[]
  architecture: readonly string[]
  priceRange: string
  timeline: string
  proofSlug?: string
}

export const serviceDetails: readonly ServiceDetail[] = [
  {
    id: 'audit',
    title: 'AI Readiness Audit',
    whoFor:
      'Teams that know they need AI but don\u2019t know where to start — or want an honest second opinion before committing budget.',
    delivered: [
      'Stakeholder interviews and workflow mapping',
      'Top 3 automatable processes ranked by ROI',
      'Build vs. buy recommendations',
      'Prioritized roadmap with timeline and cost estimates',
    ],
    architecture: ['Interviews', 'Workflow map', 'ROI model', 'Roadmap doc'],
    priceRange: '$2,500–$5,000',
    timeline: '1–2 weeks',
    proofSlug: 'enterprise-ai-audit',
  },
  {
    id: 'rag',
    title: 'Knowledge Base / RAG Systems',
    whoFor:
      'Organizations with lots of internal knowledge — documents, recordings, slides, websites — that teams need to query instantly.',
    delivered: [
      'Document ingestion pipeline (PDF, slides, transcripts, web)',
      'Queryable AI assistant with source citations',
      'Admin tools to update the knowledge base',
      'Team training and handoff documentation',
    ],
    architecture: ['Docs', 'Ingest', 'Embed', 'RAG', 'Chat UI'],
    priceRange: '$5,000–$15,000',
    timeline: '4–6 weeks',
    proofSlug: 'education-rag-tutor',
  },
  {
    id: 'agents',
    title: 'Workflow Automation / Agentic Systems',
    whoFor:
      'Teams drowning in repetitive document and workflow work — grant writing, content repurposing, CRM updates, multi-step approvals.',
    delivered: [
      'Multi-step AI agent that takes real actions',
      'Integration with your existing tools (CRM, email, docs)',
      'Human-in-the-loop approvals where needed',
      'Monitoring, logging, and iteration support',
    ],
    architecture: ['Trigger', 'Agent', 'Tools', 'CRM/Docs', 'Output'],
    priceRange: '$8,000–$25,000',
    timeline: '6–8 weeks',
    proofSlug: 'grant-writing-automation',
  },
  {
    id: 'voice',
    title: 'Voice AI Agents',
    whoFor:
      'Businesses with high-volume outbound or inbound calls — lead reactivation, appointment confirmation, patient outreach.',
    delivered: [
      'Custom voice agent (Retell, Vapi, or similar)',
      'Call scripts tuned to your use case',
      'CRM integration for call logging and follow-ups',
      'Optional ongoing monitoring and tuning',
    ],
    architecture: ['CRM', 'Voice agent', 'Call flow', 'Logs', 'Follow-up'],
    priceRange: '$5,000–$15,000 setup + $500–$1,500/mo optional',
    timeline: '4–6 weeks',
    proofSlug: 'real-estate-crm-and-voice',
  },
  {
    id: 'advisory',
    title: 'Fractional AI Advisory',
    whoFor:
      'Teams with existing AI systems who want ongoing guidance — tool evaluation, iteration, and expansion without hiring full-time.',
    delivered: [
      'Monthly strategy check-ins',
      'Tool and model evaluation',
      'Team coaching on AI workflows',
      'Iteration on existing systems',
    ],
    architecture: ['Review', 'Prioritize', 'Ship', 'Measure', 'Iterate'],
    priceRange: '$2,000–$5,000/mo',
    timeline: 'Ongoing',
  },
] as const

export const pricingPage = {
  title: 'Pricing',
  heading: 'Fixed fees, always',
  subheading:
    'You\u2019ll never get an hourly surprise. Every engagement is scoped upfront with a clear deliverable and price.',
  principle:
    'Fixed fees, always. You\u2019ll know the cost before any work begins.',
} as const

export const offerLadder = [
  { label: 'Free fit call', price: '$0', description: '15 min · qualify fit' },
  { label: 'AI Audit', price: '$2.5–5K', description: '1–2 weeks · roadmap' },
  {
    label: 'Implementation',
    price: '$8–25K',
    description: '4–8 weeks · production system',
  },
  {
    label: 'Retainer',
    price: '$2–5K/mo',
    description: 'Ongoing · fractional AI lead',
  },
] as const

export type PricingTier = {
  name: string
  priceRange: string
  timeline: string
  description: string
  features: readonly string[]
}

export const pricingTiers: readonly PricingTier[] = [
  {
    name: 'AI Readiness Audit',
    priceRange: '$2,500–$5,000',
    timeline: '1–2 weeks',
    description: 'Discovery, workflow mapping, and a prioritized roadmap.',
    features: [
      'Stakeholder interviews',
      'Top 3 ROI-ranked opportunities',
      'Build vs. buy recommendations',
      'Written deliverables',
    ],
  },
  {
    name: 'Single workflow build',
    priceRange: '$5,000–$15,000',
    timeline: '4–6 weeks',
    description: 'One production AI system, integrated with your stack.',
    features: [
      'Custom architecture and build',
      'Integration with existing tools',
      'Testing with real users',
      'Training and handoff',
    ],
  },
  {
    name: 'Multi-workflow / agent system',
    priceRange: '$15,000–$30,000',
    timeline: '6–8 weeks',
    description: 'Complex builds with multiple integrations and agents.',
    features: [
      'Multi-step agentic workflows',
      'Multiple tool integrations',
      'Guardrails and approvals',
      'Production hardening',
    ],
  },
  {
    name: 'Training workshop',
    priceRange: '$2,000–$5,000',
    timeline: 'Half day',
    description: 'Post-implementation or standalone team training.',
    features: [
      'Hands-on workshop for your team',
      'Best practices for your systems',
      'Q&A and troubleshooting',
      'Documentation walkthrough',
    ],
  },
  {
    name: 'Fractional AI advisory',
    priceRange: '$2,000–$5,000/mo',
    timeline: 'Ongoing',
    description: 'Monthly guidance, iteration, and expansion.',
    features: [
      'Monthly strategy sessions',
      'Tool and model evaluation',
      'Team coaching',
      'System iteration',
    ],
  },
] as const

export const pricingFaq: readonly FaqItem[] = [
  {
    question: 'Why fixed fees instead of hourly?',
    answer:
      'Fixed fees align incentives — we scope the work upfront, you know the cost, and we\u2019re motivated to deliver efficiently. Hourly billing rewards slow work.',
  },
  {
    question: 'What if scope changes mid-project?',
    answer:
      'We discuss changes openly. If scope grows significantly, we agree on a revised fixed fee before continuing. No surprise invoices.',
  },
  {
    question: 'Do you offer payment plans?',
    answer:
      'For larger implementations ($15K+), we can structure milestone-based payments — typically 50% at kickoff, 50% at delivery.',
  },
  {
    question: 'Is the free audit really free?',
    answer:
      'Yes. The automated audit report costs nothing and takes ~5 minutes. The paid AI Readiness Audit ($2,500–$5,000) is a deeper engagement with stakeholder interviews and a full written roadmap.',
  },
] as const

export const workPage = {
  title: 'Work',
  heading: 'Shipped systems, real outcomes',
  subheading:
    'Case studies from production AI engagements — nonprofits, real estate, education, finance, healthcare, and enterprise.',
} as const

export const footerCopy = {
  tagline:
    'Engineering-led AI consulting — audit, build, train, and hand off production systems.',
  engineerTag: 'Built by an engineer, not an agency',
} as const
