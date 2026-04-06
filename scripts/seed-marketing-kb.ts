/**
 * Seed the marketing_knowledge Qdrant collection with content from existing
 * marketing pages and components.
 *
 * Usage:
 *   npx tsx scripts/seed-marketing-kb.ts
 *
 * Re-run whenever marketing content changes.
 */
import 'dotenv/config'
import {
  clearMarketingKnowledge,
  indexMarketingChunk,
  type MarketingChunk,
} from '../src/services/marketingKnowledgeService'

const chunks: MarketingChunk[] = [
  // ─── Company Overview ──────────────────────────────────────────────────────

  {
    id: 'company-overview',
    title: 'What is Shiloh AI?',
    content:
      'Shiloh AI is a production AI agency and AI OS platform for real estate teams. We provide lead qualification, multichannel outreach, and secure automation. Shiloh AI OS connects your CRM, email, SMS, and social channels into one intelligence layer — so agents spend time on relationships and revenue instead of busywork.',
    category: 'company',
    sourceFile: 'StructuredData.tsx',
  },
  {
    id: 'company-product',
    title: 'Shiloh AI OS Product',
    content:
      'Shiloh AI OS is an AI operating system for real estate: lead qualification, reactivation, unified inbox, workflows, and voice agents. It is a SoftwareApplication in the BusinessApplication category, available as a web application.',
    category: 'company',
    sourceFile: 'StructuredData.tsx',
  },

  // ─── Founder & Credibility ─────────────────────────────────────────────────

  {
    id: 'founder-background',
    title: 'About the Founder',
    content:
      'Elijah is the founder of Shiloh AI. He is a software engineer, former Microsoft SDE, and former SDE at a Fortune 10 technology company with 3+ years building AI systems in production. At Microsoft, he implemented AI into Microsoft Teams — building real-time audio quality monitoring features used at scale. He has delivered 10+ AI projects across real estate, healthcare, nonprofits, finance, education, and more.',
    category: 'company',
    sourceFile: 'copy.ts',
  },
  {
    id: 'founder-track-record',
    title: 'Founder Track Record',
    content:
      'Key results: Built an AI grant-writing system that cut 10+ hours per submission and increased submission velocity by 25%+ for a nonprofit. Migrated a wholesale real estate client off an expensive CRM, saving $500+/mo, then built an AI Lead Manager projected to save $1,600/mo and generate $8K–$50K in new revenue. Built AI voice agents for surgery centers that automated patient outreach. Generated $13K+ in revenue for a single client in one engagement.',
    category: 'company',
    sourceFile: 'copy.ts',
  },
  {
    id: 'company-beliefs',
    title: 'What Shiloh AI Believes',
    content:
      'AI in production needs approvals, audit trails, and clear ownership — not one-off prompts. Vertical focus beats generic chatbots for compliance and integrations. Production AI systems — not a no-code wrapper shop, not a generic marketing agency.',
    category: 'company',
    sourceFile: 'about/page.tsx',
  },

  // ─── Value Propositions ────────────────────────────────────────────────────

  {
    id: 'value-speed-to-lead',
    title: 'Speed to Lead',
    content:
      'Qualify inbound leads in seconds across channels — so your team talks to ready buyers first.',
    category: 'features',
    sourceFile: 'ValueProps.tsx',
  },
  {
    id: 'value-intelligence-layer',
    title: 'One Intelligence Layer',
    content:
      'CRM, email, SMS, and social finally share context. Fewer tools, fewer dropped handoffs. Shiloh AI OS connects your stack and runs the busywork.',
    category: 'features',
    sourceFile: 'ValueProps.tsx',
  },
  {
    id: 'value-follow-up',
    title: 'Follow-up That Does Not Slip',
    content:
      'Always-on sequences and reactivation for cold leads — personalized from live CRM context.',
    category: 'features',
    sourceFile: 'ValueProps.tsx',
  },
  {
    id: 'value-agents',
    title: 'Agents That Take Action',
    content:
      'Research, drafts, CRM updates, and outreach — with guardrails and auditability. Mix and match agents for your brokerage — same memory, same workflows, same guardrails.',
    category: 'features',
    sourceFile: 'ValueProps.tsx',
  },
  {
    id: 'value-inbox',
    title: 'Unified Inbox',
    content:
      'Email, SMS, DMs, and calls in one place with AI triage and next-best-action.',
    category: 'features',
    sourceFile: 'ValueProps.tsx',
  },
  {
    id: 'value-voice',
    title: 'AI Voice',
    content:
      'AI receptionist workflows that qualify callers, answer FAQs, and book appointments.',
    category: 'features',
    sourceFile: 'ValueProps.tsx',
  },

  // ─── Agent Catalog ─────────────────────────────────────────────────────────

  {
    id: 'agent-lead-qual',
    title: 'Lead Qualification Agent',
    content:
      'Budget, timeline, pre-approval — scored and synced to CRM automatically. AI lead qualification agent for inbound across channels.',
    category: 'agents',
    sourceFile: 'AgentShowcase.tsx',
  },
  {
    id: 'agent-reactivation',
    title: 'Lead Reactivation Agent',
    content:
      'Wake dormant contacts with contextual outreach from your history and listings. Revive cold contacts with context from CRM and listing data.',
    category: 'agents',
    sourceFile: 'AgentShowcase.tsx',
  },
  {
    id: 'agent-research',
    title: 'Property Research Agent',
    content:
      'Comps, neighborhood snapshots, and talking points on demand. Property research agent for market snapshots.',
    category: 'agents',
    sourceFile: 'AgentShowcase.tsx',
  },
  {
    id: 'agent-outreach',
    title: 'Multichannel Outreach Agent',
    content:
      'Email, SMS, and social follow-ups with brand-safe templates and approvals. Outreach agent — email, SMS, social with approvals.',
    category: 'agents',
    sourceFile: 'AgentShowcase.tsx',
  },

  // ─── Pricing Tiers ─────────────────────────────────────────────────────────

  {
    id: 'pricing-starter',
    title: 'Starter Plan',
    content:
      'Starter tier: Pilot with one team — core agents and inbox. Includes lead qualification agent, unified inbox (connected integrations), basic workflows, and email support. Pricing is custom — contact us for a quote.',
    category: 'pricing',
    sourceFile: 'PricingCards.tsx',
  },
  {
    id: 'pricing-growth',
    title: 'Growth Plan',
    content:
      'Growth tier: Brokerage-wide rollout — automation + governance. Includes everything in Starter plus reactivation + outreach agents, CRM workflow automation, voice automation patterns, and priority support. Pricing is custom — contact us for a quote.',
    category: 'pricing',
    sourceFile: 'PricingCards.tsx',
  },
  {
    id: 'pricing-enterprise',
    title: 'Enterprise Plan',
    content:
      'Enterprise tier: SSO, audit, and bespoke integrations. Includes everything in Growth plus custom agents & integrations, security review support, and dedicated success. Pricing is custom — contact us for a quote.',
    category: 'pricing',
    sourceFile: 'PricingCards.tsx',
  },

  // ─── Real Estate Vertical ──────────────────────────────────────────────────

  {
    id: 'real-estate-pain',
    title: 'Pain Points for Real Estate Teams',
    content:
      'Qualification bottleneck — hundreds of leads, limited humans; AI scores and routes automatically. Fragmented stack — CRM, email, SMS, social, and transaction tools do not share context; Shiloh is one intelligence layer. Follow-up failure — slow or missing touches; always-on sequences and reactivation. Dead pipeline — old leads in CRM; contextual reactivation campaigns. Time poverty — agents buried in admin; agents and workflows handle the busywork.',
    category: 'real-estate',
    sourceFile: 'real-estate/page.tsx',
  },
  {
    id: 'real-estate-offerings',
    title: 'Real Estate Offerings',
    content:
      'AI lead qualification agent for inbound across channels. Lead reactivation agent to revive cold contacts with context. Property research agent for comps and market snapshots. Outreach agent for email, SMS, social with approvals. Unified inbox with AI triage. AI voice patterns to qualify and book by phone. CRM workflow automation for tasks, fields, and pipeline hygiene.',
    category: 'real-estate',
    sourceFile: 'real-estate/page.tsx',
  },

  // ─── FAQs ──────────────────────────────────────────────────────────────────

  {
    id: 'faq-best-ai-re',
    title: 'FAQ: Best AI for real estate lead qualification',
    content:
      'Q: What is the best AI system for real estate lead qualification? A: Look for an OS that connects CRM and channels, qualifies with explicit scripts and data fields, and routes hot leads with audit trails — Shiloh AI OS is built as that production layer for brokerages.',
    category: 'faq',
    sourceFile: 'real-estate/page.tsx',
  },
  {
    id: 'faq-multichannel',
    title: 'FAQ: Multichannel follow-up',
    content:
      'Q: How does Shiloh AI handle multichannel follow-up? A: Agents and workflows share one inbox and memory model: email, SMS, social DMs, and voice handoffs are triaged consistently, with human approval where you require it.',
    category: 'faq',
    sourceFile: 'real-estate/page.tsx',
  },
  {
    id: 'faq-safe-actions',
    title: 'FAQ: Can AI safely take actions?',
    content:
      'Q: Can AI safely take actions on our behalf? A: Yes when scoped: integrations use your OAuth connections, actions are policy-bound, and sensitive sends can require explicit approval — designed for real brokerage operations, not a raw chat window.',
    category: 'faq',
    sourceFile: 'real-estate/page.tsx',
  },
  {
    id: 'faq-voice',
    title: 'FAQ: Voice and phone workflows',
    content:
      'Q: Do you support voice and phone workflows? A: Yes — including AI receptionist-style flows: qualify callers, answer FAQs, and book appointments into your calendar stack.',
    category: 'faq',
    sourceFile: 'real-estate/page.tsx',
  },

  // ─── Testimonials ──────────────────────────────────────────────────────────

  {
    id: 'testimonial-nonprofit',
    title: 'Testimonial: Nonprofit client',
    content:
      'Nonprofit client: "From day one, Elijah brought genuine passion and focus to our project. As a software engineer on the team, he quickly picked up the technical requirements and took full ownership of the project\'s development." Project: AI-powered grant writing system for nonprofits. Results: 10+ hours saved per submission, 25%+ increase in grant submission velocity, expanded capacity without adding staff.',
    category: 'social-proof',
    sourceFile: 'copy.ts',
  },
  {
    id: 'testimonial-wholesale',
    title: 'Testimonial: Wholesale real estate client',
    content:
      'Wholesale real estate client: "We went from a bloated CRM costing us thousands to a custom system that actually fits how we work — and now AI handles our lead follow-up automatically." Results: $500+/mo saved on CRM costs, AI Lead Manager projected to save $1,600/mo and unlock $8K–$50K in additional revenue.',
    category: 'social-proof',
    sourceFile: 'copy.ts',
  },
  {
    id: 'testimonial-surgery',
    title: 'Testimonial: Surgery Center',
    content:
      'Surgery center client: "Nurses were spending hours calling patients before surgery. Now the AI handles it — patients show up prepared, and our team focuses on care instead of phone calls." Project: Retell AI voice agent for pre-op and post-op patient calls. Results: Automated patient outreach, reduced nurse admin burden, improved surgery completion rates.',
    category: 'social-proof',
    sourceFile: 'copy.ts',
  },

  // ─── Metrics ───────────────────────────────────────────────────────────────

  {
    id: 'metrics-overview',
    title: 'Shiloh AI Impact Metrics',
    content:
      'Hours saved per client weekly: 10–20+ hrs. AI projects delivered: 10+. Industries served: 5+. Revenue generated for clients: $13K+ in a single engagement. Client cost savings: Up to $2,100/mo per client.',
    category: 'social-proof',
    sourceFile: 'copy.ts',
  },

  // ─── Free AI Audit CTA ─────────────────────────────────────────────────────

  {
    id: 'audit-cta',
    title: 'Free AI Audit',
    content:
      'Get a free, personalized AI audit for your business. Takes about 5 minutes, no credit card required. You will receive a personalized report with automation opportunities, estimated time savings, and an action plan — delivered straight to your inbox. Visit example.com/marketing/audit to get started, or book a call at cal.com/shilohai/30min.',
    category: 'cta',
    sourceFile: 'audit/page.tsx',
  },

  // ─── Comparison vs Traditional ─────────────────────────────────────────────

  {
    id: 'comparison-vs-traditional',
    title: 'Shiloh AI vs Traditional CRM Workflows',
    content:
      'Lead context: Shiloh provides cross-channel memory + CRM sync, traditional has siloed inboxes and spreadsheets. Response time: Shiloh offers sub-minute triage and drafts, traditional takes hours to days. Reactivation: Shiloh runs campaigns from CRM + listing context, traditional relies on batch blasts with low relevance. Governance: Shiloh provides approvals, logging, and policy prompts, traditional is ad hoc and hard to audit.',
    category: 'real-estate',
    sourceFile: 'real-estate/page.tsx',
  },
]

async function main() {
  console.log(`Seeding ${chunks.length} marketing knowledge chunks...`)

  await clearMarketingKnowledge()
  console.log('Cleared existing marketing_knowledge collection.')

  let indexed = 0
  for (const chunk of chunks) {
    try {
      await indexMarketingChunk(chunk)
      indexed++
      console.log(`  [${indexed}/${chunks.length}] ${chunk.id}`)
    } catch (err) {
      console.error(`  FAILED: ${chunk.id}`, err)
    }
  }

  console.log(`\nDone. Indexed ${indexed}/${chunks.length} chunks.`)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
