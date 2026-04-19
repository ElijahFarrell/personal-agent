import { z } from 'zod'

/**
 * Consolidated Zod schemas for every sub-agent.
 *
 * Contracts:
 * - `*.input`   Delegation payload the supervisor sends to the sub-agent.
 * - `*.output`  Structured result the sub-agent returns (ToolResult-like envelope).
 *
 * The supervisor uses these schemas in delegation hooks to validate payloads
 * before and after each sub-agent call and to persist rows into
 * `delegations` / `agentRuns` in Convex.
 */

/* ────────────────────────────── shared primitives ────────────────────────────── */

export const ArtifactRefSchema = z.object({
  artifactId: z.string().describe('Convex document id for the artifact row'),
  kind: z.string().describe('Kind-tag (e.g. "company.list", "email.draft")'),
  title: z.string().optional(),
  summary: z.string().optional(),
})
export type ArtifactRefInput = z.infer<typeof ArtifactRefSchema>

export const ToolErrorCodeSchema = z.enum([
  'NOT_CONNECTED',
  'UNAUTHORIZED',
  'RATE_LIMITED',
  'VALIDATION',
  'NOT_FOUND',
  'CONFLICT',
  'TIMEOUT',
  'PROVIDER_ERROR',
  'INTERNAL',
  'CANCELLED',
])

export const ToolErrorSchema = z.object({
  code: ToolErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Universal envelope every sub-agent is expected to return when producing a
 * structured response. Matches the `ToolResult<T>` type in `src/types/index.ts`.
 */
export const makeAgentResultSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.discriminatedUnion('ok', [
    z.object({
      ok: z.literal(true),
      data,
      summary: z.string().optional(),
      artifact: ArtifactRefSchema.optional(),
    }),
    z.object({
      ok: z.literal(false),
      error: ToolErrorSchema,
    }),
  ])

/* ────────────────────────────── shared delegation input ────────────────────────────── */

/**
 * Every sub-agent accepts the same delegation envelope from the supervisor.
 * `userContext` and `prior` are optional so the orchestrator can forward
 * previously-produced artifacts or summaries for cross-agent work.
 */
export const DelegationInputSchema = z.object({
  task: z
    .string()
    .min(1)
    .describe('Plain-language instruction for this sub-agent. One unit of work.'),
  constraints: z
    .array(z.string())
    .optional()
    .describe('Additional constraints (e.g. "no live sends", "count=5").'),
  userContext: z
    .string()
    .optional()
    .describe('Relevant context from the user that the sub-agent must preserve.'),
  prior: z
    .array(ArtifactRefSchema)
    .optional()
    .describe('Artifact refs from earlier steps the sub-agent may consume.'),
})
export type DelegationInput = z.infer<typeof DelegationInputSchema>

/* ────────────────────────────── per-agent domain shapes ────────────────────────────── */

const CompanyRowSchema = z.object({
  companyName: z.string(),
  email: z.string().optional(),
  linkedinUrl: z.string().optional(),
  domain: z.string().optional(),
  notes: z.string().optional(),
})

const ContactRowSchema = z.object({
  fullName: z.string(),
  title: z.string().optional(),
  company: z.string().optional(),
  email: z.string().optional(),
  linkedinUrl: z.string().optional(),
  phone: z.string().optional(),
})

const UrlListSchema = z.array(z.string().url())

const EmailDraftSchema = z.object({
  to: z.array(z.string()),
  subject: z.string(),
  body: z.string(),
  scheduledAt: z.string().datetime().optional(),
})

const EventSchema = z.object({
  title: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  attendees: z.array(z.string()).optional(),
  location: z.string().optional(),
  description: z.string().optional(),
})

const DocumentSchema = z.object({
  docId: z.string().optional(),
  url: z.string().url().optional(),
  title: z.string(),
  summary: z.string().optional(),
  content: z.string().optional(),
})

const ResearchFindingSchema = z.object({
  title: z.string(),
  url: z.string().url().optional(),
  summary: z.string(),
  score: z.number().min(0).max(1).optional(),
})

const AdCreativeSchema = z.object({
  platform: z.enum(['meta', 'tiktok', 'linkedin', 'google', 'other']),
  headline: z.string().optional(),
  body: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
})

const CampaignPlanSchema = z.object({
  name: z.string(),
  audience: z.string(),
  budgetUsd: z.number().nonnegative().optional(),
  channels: z.array(z.string()),
  steps: z
    .array(
      z.object({
        step: z.string(),
        description: z.string(),
        dayOffset: z.number().int().nonnegative().optional(),
      })
    )
    .min(1),
})

const MessageResultSchema = z.object({
  channel: z.enum(['slack', 'teams', 'discord', 'sms', 'whatsapp', 'other']),
  to: z.string(),
  ok: z.boolean(),
  externalId: z.string().optional(),
})

const FinanceSummarySchema = z.object({
  accountId: z.string().optional(),
  period: z.string().describe('e.g. 2026-04'),
  totals: z.record(z.string(), z.number()),
  highlights: z.array(z.string()).optional(),
})

const PropertyListingSchema = z.object({
  address: z.string(),
  priceUsd: z.number().nonnegative().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  url: z.string().url().optional(),
  agentName: z.string().optional(),
  notes: z.string().optional(),
})

/* ────────────────────────────── per-agent schema map ────────────────────────────── */

/**
 * Each entry bundles the input delegation schema (shared) with a domain-specific
 * success-data schema. The full output envelope is `makeAgentResultSchema(data)`.
 */
export const AGENT_SCHEMAS = {
  email: {
    input: DelegationInputSchema,
    data: z.object({
      drafted: z.array(EmailDraftSchema).default([]),
      sent: z.array(EmailDraftSchema).default([]),
      inboxHighlights: z.array(z.string()).optional(),
    }),
  },
  research: {
    input: DelegationInputSchema,
    data: z.object({
      query: z.string(),
      findings: z.array(ResearchFindingSchema),
    }),
  },
  deepResearch: {
    input: DelegationInputSchema,
    data: z.object({
      query: z.string(),
      report: z.string(),
      citations: z.array(z.string().url()).default([]),
    }),
  },
  calendar: {
    input: DelegationInputSchema,
    data: z.object({
      createdEvents: z.array(EventSchema).default([]),
      upcoming: z.array(EventSchema).default([]),
    }),
  },
  linkedin: {
    input: DelegationInputSchema,
    data: z.object({
      profiles: z.array(ContactRowSchema).default([]),
      posts: z
        .array(
          z.object({
            url: z.string().url(),
            author: z.string(),
            text: z.string(),
          })
        )
        .default([]),
    }),
  },
  content: {
    input: DelegationInputSchema,
    data: z.object({
      posts: z
        .array(
          z.object({
            platform: z.string(),
            body: z.string(),
            mediaUrls: UrlListSchema.optional(),
          })
        )
        .default([]),
    }),
  },
  instagram: {
    input: DelegationInputSchema,
    data: z.object({
      posts: z
        .array(
          z.object({
            id: z.string(),
            caption: z.string().optional(),
            url: z.string().url().optional(),
            engagement: z
              .object({ likes: z.number().int(), comments: z.number().int() })
              .partial()
              .optional(),
          })
        )
        .default([]),
    }),
  },
  browser: {
    input: DelegationInputSchema,
    data: z.object({
      pagesVisited: UrlListSchema.default([]),
      extracted: z.array(z.record(z.string(), z.unknown())).default([]),
      notes: z.string().optional(),
    }),
  },
  slack: {
    input: DelegationInputSchema,
    data: z.object({
      sent: z.array(MessageResultSchema).default([]),
      threads: z
        .array(
          z.object({
            channel: z.string(),
            ts: z.string(),
            summary: z.string().optional(),
          })
        )
        .default([]),
    }),
  },
  messaging: {
    input: DelegationInputSchema,
    data: z.object({
      sent: z.array(MessageResultSchema).default([]),
    }),
  },
  notion: {
    input: DelegationInputSchema,
    data: z.object({
      pages: z
        .array(
          z.object({
            pageId: z.string(),
            url: z.string().url().optional(),
            title: z.string(),
          })
        )
        .default([]),
    }),
  },
  docs: {
    input: DelegationInputSchema,
    data: z.object({
      documents: z.array(DocumentSchema).default([]),
    }),
  },
  crm: {
    input: DelegationInputSchema,
    data: z.object({
      contactsUpserted: z.array(ContactRowSchema).default([]),
      companiesUpserted: z.array(CompanyRowSchema).default([]),
      dealsUpdated: z
        .array(
          z.object({
            dealId: z.string(),
            stage: z.string().optional(),
            amount: z.number().optional(),
          })
        )
        .default([]),
    }),
  },
  project: {
    input: DelegationInputSchema,
    data: z.object({
      tasksCreated: z
        .array(
          z.object({
            id: z.string().optional(),
            title: z.string(),
            status: z.string().optional(),
            assignee: z.string().optional(),
          })
        )
        .default([]),
    }),
  },
  realEstate: {
    input: DelegationInputSchema,
    data: z.object({
      listings: z.array(PropertyListingSchema).default([]),
    }),
  },
  finance: {
    input: DelegationInputSchema,
    data: FinanceSummarySchema,
  },
  marketing: {
    input: DelegationInputSchema,
    data: z.object({
      plan: CampaignPlanSchema.optional(),
      content: z
        .array(
          z.object({
            channel: z.string(),
            title: z.string().optional(),
            body: z.string(),
          })
        )
        .default([]),
    }),
  },
  metaAds: {
    input: DelegationInputSchema,
    data: z.object({
      campaigns: z
        .array(
          z.object({
            id: z.string().optional(),
            name: z.string(),
            status: z.string().optional(),
            budgetUsd: z.number().optional(),
          })
        )
        .default([]),
      adsets: z
        .array(
          z.object({
            id: z.string().optional(),
            name: z.string(),
            campaignId: z.string().optional(),
          })
        )
        .default([]),
    }),
  },
  adsScraper: {
    input: DelegationInputSchema,
    data: z.object({
      creatives: z.array(AdCreativeSchema).default([]),
    }),
  },
  adAnalyzer: {
    input: DelegationInputSchema,
    data: z.object({
      insights: z.array(z.string()).default([]),
      winners: z.array(AdCreativeSchema).default([]),
      recommendations: z.array(z.string()).default([]),
    }),
  },
  campaignBuilder: {
    input: DelegationInputSchema,
    data: z.object({
      plan: CampaignPlanSchema,
      drafts: z
        .array(
          z.object({
            channel: z.string(),
            body: z.string(),
          })
        )
        .default([]),
    }),
  },
  sdr: {
    input: DelegationInputSchema,
    data: z.object({
      websetId: z.string().optional(),
      companies: z.array(CompanyRowSchema).default([]),
      addedToProspects: z.number().int().nonnegative().default(0),
    }),
  },
  lead: {
    input: DelegationInputSchema,
    data: z.object({
      contacts: z.array(ContactRowSchema).default([]),
      companies: z.array(CompanyRowSchema).default([]),
    }),
  },
  auditReport: {
    input: DelegationInputSchema,
    data: z.object({
      findings: z.array(z.string()).default([]),
      risks: z.array(z.string()).default([]),
      recommendations: z.array(z.string()).default([]),
    }),
  },
} as const

export type AgentKey = keyof typeof AGENT_SCHEMAS

/**
 * Short descriptions attached to each `new Agent({ description })`. Kept separate
 * from the longer orchestrator-prompt blurbs so the Agent constructor holds only
 * a one-line purpose statement, per Mastra's supervisor-description convention.
 */
export const AGENT_META: Record<AgentKey, { description: string }> = {
  email: { description: 'Email specialist — inbox triage, drafts, replies, and sends over Gmail/Outlook.' },
  research: { description: 'Research specialist — multi-step web research with synthesis and sources.' },
  deepResearch: { description: 'Deep-research specialist — long-form reports with citations.' },
  calendar: { description: 'Calendar specialist — availability, events, scheduling via Google Calendar.' },
  linkedin: { description: 'LinkedIn specialist — profile research, personalized outreach, DM campaigns.' },
  content: { description: 'Content writer — posts, newsletters, marketing copy for any channel.' },
  instagram: { description: 'Instagram specialist — DMs, outreach, and post insights.' },
  browser: { description: 'Browser specialist — navigate sites, extract content, fill forms safely.' },
  slack: { description: 'Slack specialist — channels, DMs, thread summaries.' },
  messaging: { description: 'Messaging specialist — Slack/Teams/Discord/WhatsApp outreach.' },
  notion: { description: 'Notion specialist — pages, databases, page creation and edits.' },
  docs: { description: 'Docs specialist — Google Docs, Sheets, Airtable, Notion reads and writes.' },
  crm: { description: 'CRM specialist — HubSpot/Salesforce/Zoho/Pipedrive contacts, deals, tasks.' },
  project: { description: 'Project-management specialist — Asana/Monday issues, tasks, sprints.' },
  realEstate: { description: 'Real-estate specialist — Follow Up Boss and Calendly workflows.' },
  finance: { description: 'Finance specialist — Stripe and QuickBooks customers, charges, invoices.' },
  marketing: { description: 'Marketing specialist — Mailchimp audiences, Lemlist outreach, plans.' },
  metaAds: { description: 'Meta Ads specialist — campaigns, adsets, creatives, insights.' },
  adsScraper: { description: 'Ads scraper — collect competitor ad creatives across platforms.' },
  adAnalyzer: { description: 'Ad analyzer — extract themes, messaging, and winning patterns from scrapes.' },
  campaignBuilder: { description: 'Campaign builder — turn competitor analysis into a briefed channel plan.' },
  sdr: { description: 'SDR specialist — Exa Websets company search and past-webset retrieval. No people search, enrichment, or sending.' },
  lead: { description: 'Lead specialist — Apollo people search/enrichment/sequences plus Outlook send, with access to cached Exa webset results.' },
  auditReport: { description: 'Audit specialist — produce a findings/risks/recommendations report.' },
}

/**
 * Helper: returns the full `{ inputSchema, outputSchema }` pair for a given agent.
 * Use at the factory call site to pin defaultOptions.structuredOutput.
 */
export function getAgentSchemas<K extends AgentKey>(key: K) {
  const entry = AGENT_SCHEMAS[key]
  return {
    inputSchema: entry.input,
    outputSchema: makeAgentResultSchema(entry.data),
    dataSchema: entry.data,
  } as const
}

/**
 * Build the `structuredOutput` config block that sub-agent factories pass to
 * `new Agent({ defaultOptions: { structuredOutput: ... } })`.
 */
export function agentStructuredOutput<K extends AgentKey>(key: K) {
  return {
    schema: makeAgentResultSchema(AGENT_SCHEMAS[key].data),
    errorStrategy: 'fallback',
    fallbackValue: {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: `Agent "${key}" returned data that failed schema validation.`,
      },
    },
  } as const
}
