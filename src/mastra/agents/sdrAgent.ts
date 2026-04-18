import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AgentModels } from '@/constants/models'
import { createSubAgentMemory } from '../memory'
import { SDR_PROMPT } from '../prompts/sdr'
import {
  createCompanyWebset,
  waitForWebsetResults,
  fetchItemsByWebsetId,
  fetchAllPastWebsetResults,
  type ExaCompanyResult,
  type WebsetWaitResult,
} from '@/services/exaWebsetsService'
import { AGENT_META, getAgentSchemas } from './schemas'
import type { ToolResult } from '@/types'

export const SDR_AGENT_SCHEMAS = getAgentSchemas('sdr')

/* ─────────────────────── zod shapes ─────────────────────── */

const CompanyRowSchema = z.object({
  companyName: z.string(),
  email: z.string().optional(),
  linkedinUrl: z.string().optional(),
  domain: z.string().optional(),
})

const ArtifactRefSchema = z.object({
  artifactId: z.string(),
  kind: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
})

const ToolErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

const makeResultSchema = <T extends z.ZodTypeAny>(data: T) =>
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

const SearchResultSchema = makeResultSchema(
  z.object({
    websetId: z.string(),
    companies: z.array(CompanyRowSchema),
    status: z.enum(['idle', 'timeout', 'error']),
  })
)

const AddToProspectsResultSchema = makeResultSchema(
  z.object({
    added: z.number().int().nonnegative(),
  })
)

const FetchWebsetResultSchema = makeResultSchema(
  z.object({
    websetId: z.string(),
    companies: z.array(CompanyRowSchema),
  })
)

const AllPastWebsetsResultSchema = makeResultSchema(
  z.object({
    websets: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string(),
        dashboardUrl: z.string().optional(),
      })
    ),
    companies: z.array(CompanyRowSchema),
  })
)

const websetIdSchema = z.object({
  websetId: z
    .string()
    .describe('Exa webset ID (e.g. webset_01kkddbxd2r5s9ty4nhnxvhb88) from the dashboard URL'),
})

const searchInputSchema = z.object({
  query: z
    .string()
    .describe('Natural language search query for companies (e.g. AI startups in San Francisco)'),
  count: z.number().min(1).max(50).default(5).describe('Number of companies to fetch'),
})

const addToProspectsSchema = z.object({
  artifactId: z
    .string()
    .optional()
    .describe(
      'Convex artifact id returned from a previous Exa search tool. Preferred over inlining companies.'
    ),
  companies: z
    .array(CompanyRowSchema)
    .optional()
    .describe('Explicit list of companies, used when an artifact is not available.'),
})

/* ─────────────────────── helpers ─────────────────────── */

function formatCompaniesPreview(rows: ExaCompanyResult[], limit = 5): string {
  if (rows.length === 0) return 'No companies returned.'
  const preview = rows.slice(0, limit).map((r, i) => {
    const parts = [r.companyName]
    if (r.email) parts.push(`<${r.email}>`)
    if (r.domain) parts.push(`(${r.domain})`)
    return `${i + 1}. ${parts.join(' ')}`
  })
  const more = rows.length > limit ? `\n… +${rows.length - limit} more` : ''
  return preview.join('\n') + more
}

function toolErr(
  code: string,
  message: string,
  extras: {
    retryable?: boolean
    details?: Record<string, unknown>
  } = {}
): { ok: false; error: { code: string; message: string; retryable?: boolean; details?: Record<string, unknown> } } {
  return { ok: false, error: { code, message, ...extras } }
}

/* ─────────────────────── factory ─────────────────────── */

/** SDR tools (Exa Websets). Exported for use in lead agent. */
export function getSDRTools(userId: string, tenantId: string) {
  const convex = process.env.NEXT_PUBLIC_CONVEX_URL
    ? new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
    : null

  /** Look up the most recent non-terminal agent run to attach externalIds to. */
  async function resolveActiveRunId(): Promise<Id<'agentRuns'> | null> {
    if (!convex) return null
    try {
      const dbUser = await convex.query(api.users.getUserByClerkUserId, {
        clerkUserId: userId,
      })
      if (!dbUser || String(dbUser.tenantId) !== tenantId) return null
      const row = await convex.query(api.agentRuns.getActiveForUser, {
        tenantId: tenantId as Id<'tenants'>,
        userId: dbUser._id,
        agentIds: ['sdr', 'lead', 'agent-sdr', 'agent-lead', 'orchestrator'],
      })
      return (row?._id as Id<'agentRuns'> | undefined) ?? null
    } catch (err) {
      console.warn('[sdr] resolveActiveRunId failed:', err)
      return null
    }
  }

  async function persistWebsetId(websetId: string): Promise<void> {
    if (!convex) return
    const runId = await resolveActiveRunId()
    if (!runId) return
    try {
      await convex.mutation(api.agentRuns.setExternalIds, {
        runId,
        externalIds: { websetId },
      })
    } catch (err) {
      console.warn('[sdr] setExternalIds failed:', err)
    }
  }

  async function persistCompaniesArtifact(
    companies: ExaCompanyResult[],
    kind: string,
    title: string,
    summary: string
  ): Promise<{ artifactId: string; runId: Id<'agentRuns'> | null } | null> {
    if (!convex || companies.length === 0) return null
    try {
      const dbUser = await convex.query(api.users.getUserByClerkUserId, {
        clerkUserId: userId,
      })
      if (!dbUser || String(dbUser.tenantId) !== tenantId) return null
      const runId = await resolveActiveRunId()
      const artifactId = await convex.mutation(api.artifacts.create, {
        tenantId: tenantId as Id<'tenants'>,
        userId: dbUser._id,
        runId: runId ?? undefined,
        kind,
        title,
        summary,
        data: { companies },
      })
      return { artifactId: String(artifactId), runId }
    } catch (err) {
      console.warn('[sdr] persistCompaniesArtifact failed:', err)
      return null
    }
  }

  async function loadCompaniesFromArtifact(
    artifactId: string
  ): Promise<ExaCompanyResult[] | null> {
    if (!convex) return null
    try {
      const artifact = await convex.query(api.artifacts.getById, {
        artifactId: artifactId as Id<'artifacts'>,
      })
      if (!artifact || String(artifact.tenantId) !== tenantId) return null
      const data = artifact.data as { companies?: ExaCompanyResult[] } | undefined
      return data?.companies ?? null
    } catch (err) {
      console.warn('[sdr] loadCompaniesFromArtifact failed:', err)
      return null
    }
  }

  return {
    runExaWebsetSearch: createTool({
      id: 'run-exa-webset-search',
      description:
        'Search for companies via Exa Websets. Returns a ToolResult envelope with the websetId, companies, and an artifactId. ' +
        'First run: use count=5 for a sample. If user wants more, run again with count=15 or 20. ' +
        'Always hand the artifactId to addExaResultsToProspects rather than re-inlining the list.',
      inputSchema: searchInputSchema,
      outputSchema: SearchResultSchema,
      execute: async (input): Promise<ToolResult<{
        websetId: string
        companies: ExaCompanyResult[]
        status: 'idle' | 'timeout' | 'error'
      }>> => {
        let websetId: string
        try {
          const created = await createCompanyWebset(input.query, input.count)
          websetId = created.websetId
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return toolErr('PROVIDER_ERROR', `Failed to create Exa webset: ${message}`, {
            retryable: true,
          })
        }

        await persistWebsetId(websetId)

        const wait: WebsetWaitResult = await waitForWebsetResults(
          websetId,
          input.count
        )

        const artifact = await persistCompaniesArtifact(
          wait.results,
          'exa.websetItems',
          `Exa search: ${input.query}`,
          `${wait.results.length} companies (webset ${websetId}, status ${wait.status})`
        )

        const summary =
          wait.status === 'idle'
            ? `Webset ${websetId} complete — ${wait.results.length} companies.`
            : wait.status === 'timeout'
              ? `Webset ${websetId} still running after wait budget — returning ${wait.results.length} partial companies. Retry with fetch-exa-webset-by-id.`
              : `Webset ${websetId} errored (${wait.error ?? 'unknown'}) — returning ${wait.results.length} partial companies.`

        return {
          ok: true,
          data: {
            websetId,
            companies: wait.results,
            status: wait.status,
          },
          summary: `${summary}\n\n${formatCompaniesPreview(wait.results)}`,
          artifact: artifact
            ? {
                artifactId: artifact.artifactId,
                kind: 'exa.websetItems',
                title: `Exa search: ${input.query}`,
                summary: `${wait.results.length} companies (webset ${websetId})`,
              }
            : undefined,
        }
      },
    }),

    addExaResultsToProspects: createTool({
      id: 'add-exa-results-to-prospects',
      description:
        "Add Exa search results to the user's Prospects page. Prefer passing the `artifactId` from a previous Exa tool; " +
        'only fall back to inlining `companies` when no artifact is available.',
      inputSchema: addToProspectsSchema,
      outputSchema: AddToProspectsResultSchema,
      execute: async (input): Promise<ToolResult<{ added: number }>> => {
        if (!convex) {
          return toolErr('INTERNAL', 'No Convex client configured.')
        }
        let companies: ExaCompanyResult[] | null = null
        if (input.artifactId) {
          companies = await loadCompaniesFromArtifact(input.artifactId)
          if (!companies) {
            return toolErr('NOT_FOUND', `Artifact ${input.artifactId} not found or empty.`)
          }
        } else if (input.companies && input.companies.length > 0) {
          companies = input.companies
        } else {
          return toolErr('VALIDATION', 'Provide either artifactId or companies.')
        }

        try {
          const added = await convex.mutation(api.prospects.importFromExa, {
            tenantId: tenantId as Id<'tenants'>,
            rows: companies.map((r) => ({
              companyName: r.companyName,
              email: r.email,
              linkedinUrl: r.linkedinUrl,
              domain: r.domain,
            })),
          })
          return {
            ok: true,
            data: { added },
            summary: `Added ${added} companies to the Prospects page.`,
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return toolErr('PROVIDER_ERROR', `Failed to import prospects: ${message}`, {
            retryable: true,
          })
        }
      },
    }),

    fetchExaWebsetById: createTool({
      id: 'fetch-exa-webset-by-id',
      description:
        'Fetch results from an existing Exa webset by id. Returns a ToolResult with the companies and an artifactId. ' +
        'Use when the user pastes a webset id from the Exa dashboard.',
      inputSchema: websetIdSchema.extend({
        limit: z.number().min(1).max(100).optional().default(50),
      }),
      outputSchema: FetchWebsetResultSchema,
      execute: async (input): Promise<ToolResult<{
        websetId: string
        companies: ExaCompanyResult[]
      }>> => {
        try {
          const companies = await fetchItemsByWebsetId(input.websetId, input.limit)
          const artifact = await persistCompaniesArtifact(
            companies,
            'exa.websetItems',
            `Exa webset ${input.websetId}`,
            `${companies.length} companies (webset ${input.websetId})`
          )
          return {
            ok: true,
            data: { websetId: input.websetId, companies },
            summary: `Loaded ${companies.length} companies from webset ${input.websetId}.\n\n${formatCompaniesPreview(companies)}`,
            artifact: artifact
              ? {
                  artifactId: artifact.artifactId,
                  kind: 'exa.websetItems',
                  title: `Exa webset ${input.websetId}`,
                  summary: `${companies.length} companies`,
                }
              : undefined,
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return toolErr('PROVIDER_ERROR', `Failed to fetch webset: ${message}`, {
            retryable: true,
          })
        }
      },
    }),

    addExaWebsetToProspects: createTool({
      id: 'add-exa-webset-to-prospects',
      description:
        'Add an existing Exa webset directly to Prospects by id. Fetches items and imports them in one step.',
      inputSchema: websetIdSchema.extend({
        limit: z.number().min(1).max(100).optional().default(100),
      }),
      outputSchema: AddToProspectsResultSchema,
      execute: async (input): Promise<ToolResult<{ added: number }>> => {
        if (!convex) {
          return toolErr('INTERNAL', 'No Convex client configured.')
        }
        try {
          const results = await fetchItemsByWebsetId(input.websetId, input.limit)
          if (results.length === 0) {
            return toolErr('NOT_FOUND', `No companies found in webset ${input.websetId}.`)
          }
          const added = await convex.mutation(api.prospects.importFromExa, {
            tenantId: tenantId as Id<'tenants'>,
            rows: results.map((r) => ({
              companyName: r.companyName,
              email: r.email,
              linkedinUrl: r.linkedinUrl,
              domain: r.domain,
            })),
          })
          return {
            ok: true,
            data: { added },
            summary: `Added ${added} companies from webset ${input.websetId}.`,
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return toolErr('PROVIDER_ERROR', `Failed to import webset: ${message}`, {
            retryable: true,
          })
        }
      },
    }),

    fetchAllPastWebsetResults: createTool({
      id: 'fetch-all-past-webset-results',
      description:
        'List all Exa websets and fetch deduplicated company results. Returns a ToolResult with webset summaries, companies, and an artifactId.',
      inputSchema: z.object({
        itemsPerWebset: z.number().min(1).max(100).optional().default(100),
      }),
      outputSchema: AllPastWebsetsResultSchema,
      execute: async (input): Promise<ToolResult<{
        websets: Array<{ id: string; createdAt: string; dashboardUrl?: string }>
        companies: ExaCompanyResult[]
      }>> => {
        try {
          const { websets, results } = await fetchAllPastWebsetResults(
            input.itemsPerWebset
          )
          const artifact = await persistCompaniesArtifact(
            results,
            'exa.pastWebsets',
            'All past Exa websets',
            `${results.length} deduplicated companies across ${websets.length} websets`
          )
          return {
            ok: true,
            data: { websets, companies: results },
            summary:
              `Found ${websets.length} websets, ${results.length} deduplicated companies.\n\n` +
              formatCompaniesPreview(results),
            artifact: artifact
              ? {
                  artifactId: artifact.artifactId,
                  kind: 'exa.pastWebsets',
                  title: 'All past Exa websets',
                  summary: `${results.length} companies`,
                }
              : undefined,
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return toolErr(
            'PROVIDER_ERROR',
            `Failed to fetch past websets: ${message}`,
            { retryable: true }
          )
        }
      },
    }),
  }
}

/** Factory creates an SDR agent scoped to a user. */
export function createSDRAgent(userId: string, tenantId: string) {
  return new Agent({
    id: `sdr-${userId}`,
    name: 'sdr',
    description: AGENT_META.sdr.description,
    instructions: SDR_PROMPT,
    model: AgentModels.content(),
    memory: createSubAgentMemory('sdr'),
    tools: getSDRTools(userId, tenantId),
  })
}
