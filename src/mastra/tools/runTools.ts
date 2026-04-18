import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ToolResult } from '@/types'

/**
 * Orchestrator-level run and artifact introspection tools.
 *
 * These expose the durable state model (agentRuns / artifacts / plan) back to
 * the LLM so it can ask "what's the status of this run?", cancel a runaway
 * job, fetch a previously-produced artifact, or write down its own plan for
 * the current run.
 *
 * All handlers are best-effort and tenant-scoped — they return structured
 * {@link ToolResult} envelopes so the orchestrator can dispatch on `.ok`
 * without parsing free-form strings.
 */

function getConvex(): ConvexHttpClient | null {
  return process.env.NEXT_PUBLIC_CONVEX_URL
    ? new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
    : null
}

function toolErr(
  code: string,
  message: string,
  extras: { retryable?: boolean; details?: Record<string, unknown> } = {}
): { ok: false; error: { code: string; message: string; retryable?: boolean; details?: Record<string, unknown> } } {
  return { ok: false, error: { code, message, ...extras } }
}

const ToolErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

const makeResultSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), data, summary: z.string().optional() }),
    z.object({ ok: z.literal(false), error: ToolErrorSchema }),
  ])

const RunStatusSchema = z.enum([
  'pending',
  'running',
  'suspended',
  'completed',
  'failed',
  'cancelled',
])

const RunRowSchema = z.object({
  runId: z.string(),
  agentId: z.string(),
  status: RunStatusSchema,
  title: z.string().optional(),
  threadId: z.string().optional(),
  parentRunId: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().optional(),
  error: z.string().optional(),
  externalIds: z.record(z.string(), z.string()).optional(),
})

const RunDetailSchema = RunRowSchema.extend({
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  plan: z.unknown().optional(),
  children: z.array(RunRowSchema).optional(),
})

const WebsetPreviewEntrySchema = z.object({
  companyName: z.string(),
  domain: z.string().optional(),
  email: z.string().optional(),
})

const WebsetSummarySchema = z.object({
  websetId: z.string(),
  websetTitle: z.string().optional(),
  sourceRunId: z.string().optional(),
  count: z.number(),
  newestAt: z.number(),
  preview: z.array(WebsetPreviewEntrySchema),
})

const ArtifactSchema = z.object({
  artifactId: z.string(),
  kind: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  data: z.unknown(),
  runId: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

type RunRow = {
  _id: Id<'agentRuns'>
  agentId: string
  status: string
  title?: string
  threadId?: string
  parentRunId?: Id<'agentRuns'>
  createdAt: number
  updatedAt: number
  completedAt?: number
  error?: string
  externalIds?: Record<string, string>
  input?: unknown
  output?: unknown
  plan?: unknown
}

function normalizeRun(row: RunRow): z.infer<typeof RunRowSchema> {
  return {
    runId: String(row._id),
    agentId: row.agentId,
    status: row.status as z.infer<typeof RunStatusSchema>,
    title: row.title,
    threadId: row.threadId,
    parentRunId: row.parentRunId ? String(row.parentRunId) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    error: row.error,
    externalIds: row.externalIds,
  }
}

/**
 * Orchestrator-level run + artifact primitives. Scoped to `userId` / `tenantId`
 * so the model can only read rows that belong to the active session.
 */
export function createRunTools(userId: string, tenantId: string) {
  const convex = getConvex()

  async function resolveUser() {
    if (!convex) return null
    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser || String(dbUser.tenantId) !== tenantId) return null
    return dbUser
  }

  async function resolveActiveOrchestratorRunId(): Promise<Id<'agentRuns'> | null> {
    if (!convex) return null
    const dbUser = await resolveUser()
    if (!dbUser) return null
    const row = await convex.query(api.agentRuns.getActiveForUser, {
      tenantId: tenantId as Id<'tenants'>,
      userId: dbUser._id,
      agentIds: ['orchestrator'],
    })
    return (row?._id as Id<'agentRuns'> | undefined) ?? null
  }

  const runsGetStatus = createTool({
    id: 'runs-get-status',
    description:
      'Fetch the durable status of an agent run by id, including direct child delegations. ' +
      'Use to answer "what happened on run X?" or to surface progress to the user.',
    inputSchema: z.object({
      runId: z.string().describe('Convex agentRuns id returned by a previous tool.'),
    }),
    outputSchema: makeResultSchema(RunDetailSchema),
    execute: async (input): Promise<ToolResult<z.infer<typeof RunDetailSchema>>> => {
      if (!convex) return toolErr('INTERNAL', 'No Convex client configured.')
      try {
        const bundle = await convex.query(api.agentRuns.getWithChildren, {
          runId: input.runId as Id<'agentRuns'>,
        })
        if (!bundle || !bundle.run) {
          return toolErr('NOT_FOUND', `Run ${input.runId} not found.`)
        }
        if (String(bundle.run.tenantId) !== tenantId) {
          return toolErr('UNAUTHORIZED', 'Run belongs to a different tenant.')
        }
        const run = normalizeRun(bundle.run as RunRow)
        const detail: z.infer<typeof RunDetailSchema> = {
          ...run,
          input: (bundle.run as RunRow).input,
          output: (bundle.run as RunRow).output,
          plan: (bundle.run as RunRow).plan,
          children: (bundle.children as RunRow[]).map(normalizeRun),
        }
        return {
          ok: true,
          data: detail,
          summary: `Run ${detail.runId} (${detail.agentId}) is ${detail.status}. ${detail.children?.length ?? 0} child delegations.`,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return toolErr('PROVIDER_ERROR', `Failed to load run: ${message}`, {
          retryable: true,
        })
      }
    },
  })

  const runsCancel = createTool({
    id: 'runs-cancel',
    description:
      'Cancel a running or pending agent run. Child delegations are cancelled best-effort. ' +
      'Use when the user asks to stop or abort a long-running job.',
    inputSchema: z.object({
      runId: z.string().describe('Convex agentRuns id to cancel.'),
    }),
    outputSchema: makeResultSchema(z.object({ runId: z.string() })),
    execute: async (input): Promise<ToolResult<{ runId: string }>> => {
      if (!convex) return toolErr('INTERNAL', 'No Convex client configured.')
      try {
        const existing = await convex.query(api.agentRuns.getById, {
          runId: input.runId as Id<'agentRuns'>,
        })
        if (!existing) return toolErr('NOT_FOUND', `Run ${input.runId} not found.`)
        if (String(existing.tenantId) !== tenantId) {
          return toolErr('UNAUTHORIZED', 'Run belongs to a different tenant.')
        }
        await convex.mutation(api.agentRuns.cancel, {
          runId: input.runId as Id<'agentRuns'>,
        })
        return {
          ok: true,
          data: { runId: input.runId },
          summary: `Run ${input.runId} cancelled.`,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return toolErr('PROVIDER_ERROR', `Failed to cancel run: ${message}`, {
          retryable: true,
        })
      }
    },
  })

  const runsListRecent = createTool({
    id: 'runs-list-recent',
    description:
      'List recent agent runs for the current tenant. Use to answer "what have you been doing lately?" or to locate a runId.',
    inputSchema: z.object({
      limit: z.number().min(1).max(50).optional().default(10),
    }),
    outputSchema: makeResultSchema(z.object({ runs: z.array(RunRowSchema) })),
    execute: async (
      input
    ): Promise<ToolResult<{ runs: z.infer<typeof RunRowSchema>[] }>> => {
      if (!convex) return toolErr('INTERNAL', 'No Convex client configured.')
      try {
        const rows = await convex.query(api.agentRuns.listRecent, {
          tenantId: tenantId as Id<'tenants'>,
          limit: input.limit,
        })
        const runs = (rows as RunRow[]).map(normalizeRun)
        return {
          ok: true,
          data: { runs },
          summary: `${runs.length} recent runs.`,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return toolErr('PROVIDER_ERROR', `Failed to list runs: ${message}`, {
          retryable: true,
        })
      }
    },
  })

  const artifactsGet = createTool({
    id: 'artifacts-get',
    description:
      'Load the full structured payload for a previously-produced artifact (prospect list, ads brief, webset items, ...). ' +
      'Use this before acting on `artifactId` values returned by sub-agents.',
    inputSchema: z.object({
      artifactId: z.string().describe('Convex artifactId returned by an earlier tool.'),
    }),
    outputSchema: makeResultSchema(ArtifactSchema),
    execute: async (
      input
    ): Promise<ToolResult<z.infer<typeof ArtifactSchema>>> => {
      if (!convex) return toolErr('INTERNAL', 'No Convex client configured.')
      try {
        const row = await convex.query(api.artifacts.getById, {
          artifactId: input.artifactId as Id<'artifacts'>,
        })
        if (!row) return toolErr('NOT_FOUND', `Artifact ${input.artifactId} not found.`)
        if (String(row.tenantId) !== tenantId) {
          return toolErr('UNAUTHORIZED', 'Artifact belongs to a different tenant.')
        }
        return {
          ok: true,
          data: {
            artifactId: String(row._id),
            kind: row.kind,
            title: row.title,
            summary: row.summary,
            data: row.data,
            runId: row.runId ? String(row.runId) : undefined,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
          summary: row.summary ?? `Artifact ${row._id} (${row.kind}).`,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return toolErr('PROVIDER_ERROR', `Failed to load artifact: ${message}`, {
          retryable: true,
        })
      }
    },
  })

  const writePlan = createTool({
    id: 'write-plan',
    description:
      "Record the orchestrator's execution plan for the current run so the UI and downstream tools can see it. " +
      'Call this once near the start of a multi-step task with an ordered list of steps (label + agentId).',
    inputSchema: z.object({
      runId: z
        .string()
        .optional()
        .describe('Specific run id. Defaults to the current orchestrator run.'),
      title: z.string().optional(),
      steps: z
        .array(
          z.object({
            label: z.string(),
            agentId: z.string().optional(),
            status: z
              .enum(['pending', 'running', 'completed', 'failed'])
              .optional(),
          })
        )
        .min(1),
      notes: z.string().optional(),
    }),
    outputSchema: makeResultSchema(z.object({ runId: z.string() })),
    execute: async (input): Promise<ToolResult<{ runId: string }>> => {
      if (!convex) return toolErr('INTERNAL', 'No Convex client configured.')
      try {
        let runId: Id<'agentRuns'> | null = null
        if (input.runId) {
          const existing = await convex.query(api.agentRuns.getById, {
            runId: input.runId as Id<'agentRuns'>,
          })
          if (!existing) {
            return toolErr('NOT_FOUND', `Run ${input.runId} not found.`)
          }
          if (String(existing.tenantId) !== tenantId) {
            return toolErr('UNAUTHORIZED', 'Run belongs to a different tenant.')
          }
          runId = input.runId as Id<'agentRuns'>
        } else {
          runId = await resolveActiveOrchestratorRunId()
        }
        if (!runId) {
          return toolErr(
            'NOT_FOUND',
            'No active orchestrator run available to attach plan.'
          )
        }
        await convex.mutation(api.agentRuns.setPlan, {
          runId,
          plan: {
            title: input.title,
            steps: input.steps,
            notes: input.notes,
            updatedAt: Date.now(),
          },
        })
        return {
          ok: true,
          data: { runId: String(runId) },
          summary: `Plan saved for run ${runId} (${input.steps.length} steps).`,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return toolErr('PROVIDER_ERROR', `Failed to save plan: ${message}`, {
          retryable: true,
        })
      }
    },
  })

  const listRecentWebsets = createTool({
    id: 'list-recent-websets',
    description:
      'List recently synced Exa webset searches for this tenant, with item counts and a short preview of companies. ' +
      'Backed by the cached `websetItems` table so this is cheap to call and safe from Exa outages.',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe('Maximum number of websets to return. Defaults to 10.'),
    }),
    outputSchema: makeResultSchema(
      z.object({ websets: z.array(WebsetSummarySchema) })
    ),
    execute: async (
      input
    ): Promise<ToolResult<{ websets: z.infer<typeof WebsetSummarySchema>[] }>> => {
      if (!convex) return toolErr('INTERNAL', 'No Convex client configured.')
      try {
        const rows = (await convex.query(api.websetItems.listRecent, {
          tenantId: tenantId as Id<'tenants'>,
          limit: input.limit,
        })) as z.infer<typeof WebsetSummarySchema>[]
        return {
          ok: true,
          data: { websets: rows },
          summary: `${rows.length} past websets available (${rows.reduce(
            (n, w) => n + w.count,
            0
          )} items total).`,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return toolErr('PROVIDER_ERROR', `Failed to list websets: ${message}`, {
          retryable: true,
        })
      }
    },
  })

  return {
    'runs-get-status': runsGetStatus,
    'runs-cancel': runsCancel,
    'runs-list-recent': runsListRecent,
    'artifacts-get': artifactsGet,
    'write-plan': writePlan,
    'list-recent-websets': listRecentWebsets,
  }
}
