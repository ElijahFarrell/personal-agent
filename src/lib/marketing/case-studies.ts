/**
 * Case study content for /work and /work/[slug].
 */

export type CaseStudyMetric = {
  value: string
  label: string
}

export type CaseStudy = {
  slug: string
  clientType: string
  headline: string
  summary: string
  tags: readonly string[]
  metrics: readonly CaseStudyMetric[]
  problem: string
  solution: string
  architecture: readonly string[]
  results: readonly string[]
  testimonial?: {
    quote: string
    attribution: string
  }
  relatedServiceId: string
}

export const CASE_STUDIES: readonly CaseStudy[] = [
  {
    slug: 'grant-writing-automation',
    clientType: 'Nonprofit',
    headline: 'Grant writing automation that cut 10+ hours per submission',
    summary:
      'Agentic RAG pipeline for 50+ page grant documents — automated drafting, Q&A, and knowledge base updates.',
    tags: ['AGENTS', 'RAG'],
    metrics: [
      { value: '10+ hrs', label: 'saved per submission' },
      { value: '25%', label: 'more submissions' },
      { value: '~$13K/mo', label: 'revenue lift' },
    ],
    problem:
      'Grant writers spent 10+ hours per submission processing long documents (50+ pages), researching requirements, and drafting narratives from scratch. The team could only submit a limited number of grants each month.',
    solution:
      'Built an agentic RAG system: ingest long grant documents, answer direct questions, auto-generate first-draft narratives from custom org info and website data, and automatically add new docs to the knowledge base. Made key architecture decisions on fine-tune vs RAG for the use case.',
    architecture: ['Grant docs', 'Ingest', 'RAG', 'Draft agent', 'Review'],
    results: [
      'Reduced grant writing time by over 10 hours per submission',
      'Increased grant submission velocity by more than 25%',
      'Expanded organizational capacity without adding staff',
      'Increased client monthly revenue by approximately $13K',
    ],
    testimonial: {
      quote:
        'From day one, the engineering lead brought genuine passion and focus to our project. They quickly picked up the technical requirements and took full ownership of the project\u2019s development — standing out for quality of work and thoughtful customer interactions.',
      attribution: 'Nonprofit client',
    },
    relatedServiceId: 'agents',
  },
  {
    slug: 'education-rag-tutor',
    clientType: 'Education',
    headline: 'RAG tutor from professor recordings and course materials',
    summary:
      'Knowledge base chatbots for a university course and an internship program — 24/7 student self-service.',
    tags: ['RAG'],
    metrics: [
      { value: '24/7', label: 'student self-service' },
      { value: '2', label: 'programs served' },
    ],
    problem:
      'Students needed answers about course content and internship program details, but professors and admins were overwhelmed with repetitive questions. Office hours and email weren\u2019t scaling.',
    solution:
      'Built RAG chatbots that ingest professor recordings (via Deepgram transcripts), PowerPoints, slides, and program documentation. Students ask questions and get answers grounded in the actual course material — as if the professor were talking to them.',
    architecture: ['Recordings', 'Transcripts', 'Slides', 'Embed', 'Chat'],
    results: [
      'Reduced admin load for course and program staff',
      'Students get instant answers outside office hours',
      'Two separate knowledge bases deployed for different programs',
    ],
    relatedServiceId: 'rag',
  },
  {
    slug: 'real-estate-crm-and-voice',
    clientType: 'Real estate · Wholesale',
    headline: 'CRM migration and voice lead reactivation',
    summary:
      'Custom CRM saving $500+/mo plus an AI voice agent to reactivate dormant seller leads.',
    tags: ['VOICE', 'AGENTS'],
    metrics: [
      { value: '$500+/mo', label: 'CRM savings' },
      { value: '$8K–$50K', label: 'revenue potential' },
    ],
    problem:
      'The client was paying thousands for a bloated CRM that didn\u2019t fit their workflow. Worse, they had sellers in their CRM they never followed up with — potential deals slipping through the cracks.',
    solution:
      'Migrated to a custom CRM tailored to their wholesale process, then built an AI voice Lead Manager Agent to automatically call and reactivate dormant seller leads from their CRM.',
    architecture: ['CRM data', 'Voice agent', 'Call flow', 'Lead scoring', 'Pipeline'],
    results: [
      'Saved $500+/month on CRM costs',
      'Voice agent projected to save $1,600/month in manual outreach',
      'Potential $8K–$50K in additional revenue from reactivated leads',
    ],
    relatedServiceId: 'voice',
  },
  {
    slug: 'financial-services-lead-bot',
    clientType: 'Financial services',
    headline: 'Website chatbot with lead capture and CRM integration',
    summary:
      'Front-door qualification bot that answers inquiries and captures leads directly into CRM forms.',
    tags: ['RAG'],
    metrics: [
      { value: '24/7', label: 'inquiry handling' },
      { value: 'CRM', label: 'integrated capture' },
    ],
    problem:
      'Website inquiries were falling through — visitors had questions but no immediate way to get answers or opt in for contact. Manual intake was slow and leads were lost.',
    solution:
      'Built a website chatbot that answers customer inquiries upfront, offers AI-assisted contact opt-in, and captures user information directly into a CRM form for follow-up.',
    architecture: ['Website', 'Chatbot', 'Qualify', 'CRM form', 'Follow-up'],
    results: [
      'Front-door qualification for website visitors',
      'Captured leads automatically into CRM',
      'Reduced manual intake workload',
    ],
    relatedServiceId: 'rag',
  },
  {
    slug: 'surgery-center-voice-agent',
    clientType: 'Healthcare · Surgery center',
    headline: 'Pre-op and post-op voice agent for patient outreach',
    summary:
      'HIPAA-compliant calling agent that confirms patients, verifies prep, and follows up after surgery.',
    tags: ['VOICE'],
    metrics: [
      { value: 'HIPAA', label: 'compliant + BAA' },
      { value: 'Pre + post', label: 'op calling' },
    ],
    problem:
      'Overwhelmed nurses at surgery centers spent hours calling patients before surgery with instructions. Patients who weren\u2019t properly prepped led to cancelled or incomplete cases — lost revenue for the center.',
    solution:
      'Built a Retell AI voice agent that calls patients before surgery with all instructions, verifies prep compliance, and follows up post-op. Center owners get confirmation that calls are being made; nurses focus on in-facility care.',
    architecture: ['Schedule', 'Voice agent', 'Prep script', 'Escalate', 'Log'],
    results: [
      'Automated patient outreach before and after surgery',
      'Reduced nurse admin burden from phone calls',
      'Increased patient preparedness and surgery completion rates',
      'HIPAA-compliant with signed BAA',
    ],
    relatedServiceId: 'voice',
  },
  {
    slug: 'enterprise-ai-audit',
    clientType: 'Enterprise',
    headline: 'AI audit — from interviews to a working POC',
    summary:
      'Stakeholder interviews, prioritized roadmap, and proof-of-concept for the highest-value AI use case.',
    tags: ['AUDIT'],
    metrics: [
      { value: 'Interviews', label: 'stakeholders' },
      { value: '1', label: 'POC delivered' },
    ],
    problem:
      'The team knew AI could help but didn\u2019t know where to start. Multiple potential use cases competed for attention without a clear ROI ranking or implementation plan.',
    solution:
      'Ran stakeholder interviews, compiled the findings into a structured brief, ranked use cases by value, and built a POC plus an implementation roadmap for the top problem.',
    architecture: ['Interviews', 'Research', 'Prioritize', 'POC', 'Roadmap'],
    results: [
      'Clear prioritization of AI opportunities by business value',
      'Stakeholder alignment through structured interviews',
      'Working POC demonstrating feasibility',
      'Implementation roadmap for the team to execute',
    ],
    relatedServiceId: 'audit',
  },
] as const

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((cs) => cs.slug === slug)
}

export function getAllCaseStudySlugs(): string[] {
  return CASE_STUDIES.map((cs) => cs.slug)
}
