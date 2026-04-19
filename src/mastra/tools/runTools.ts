import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ToolResult } from '@/types'
import { createWebsetTools } from './websetTools'

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

  /**
   * Router tool covering the three low-frequency run-introspection calls.
   * Merged from `runs-get-status` / `runs-list-recent` / `runs-cancel` so the
   * orchestrator's tool surface stays under ~20 (see docs/agentic-orchestration.md).
   */
  const RunsActionSchema = z.enum(['get', 'list', 'cancel'])

  const RunsInputSchema = z
    .object({
      action: RunsActionSchema.describe(
        '`get` = fetch one run + its child delegations (requires runId). ' +
          '`list` = recent runs for the current tenant (optional limit, default 10). ' +
          '`cancel` = cancel a running/pending run (requires runId).'
      ),
      runId: z
        .string()
        .optional()
        .describe('Convex agentRuns id. Required for `get` and `cancel`.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Only used when action="list". Defaults to 10.'),
    })
    .superRefine((val, ctx) => {
      if ((val.action === 'get' || val.action === 'cancel') && !val.runId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `action="${val.action}" requires runId`,
          path: ['runId'],
        })
      }
    })

  const RunsOutputSchema = makeResultSchema(
    z.object({
      action: RunsActionSchema,
      run: RunDetailSchema.optional(),
      runs: z.array(RunRowSchema).optional(),
      cancelledRunId: z.string().optional(),
    })
  )

  type RunsOutput = {
    action: z.infer<typeof RunsActionSchema>
    run?: z.infer<typeof RunDetailSchema>
    runs?: z.infer<typeof RunRowSchema>[]
    cancelledRunId?: string
  }

  const runsRouter = createTool({
    id: 'runs',
    description:
      'Agent-run introspection router. Pick `action`: ' +
      '`get` (load one run + its direct child delegations), ' +
      '`list` (recent runs for the current tenant — use to find a runId), or ' +
      '`cancel` (stop a running or pending run). ' +
      'Use to answer "what happened on run X?", "what have you been doing lately?", or to abort a long-running job.',
    inputSchema: RunsInputSchema,
    outputSchema: RunsOutputSchema,
    execute: async (input): Promise<ToolResult<RunsOutput>> => {
      if (!convex) return toolErr('INTERNAL', 'No Convex client configured.')
      try {
        if (input.action === 'get') {
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
            data: { action: 'get', run: detail },
            summary: `Run ${detail.runId} (${detail.agentId}) is ${detail.status}. ${detail.children?.length ?? 0} child delegations.`,
          }
        }

        if (input.action === 'list') {
          const rows = await convex.query(api.agentRuns.listRecent, {
            tenantId: tenantId as Id<'tenants'>,
            limit: input.limit ?? 10,
          })
          const runs = (rows as RunRow[]).map(normalizeRun)
          return {
            ok: true,
            data: { action: 'list', runs },
            summary: `${runs.length} recent runs.`,
          }
        }

        // action === 'cancel'
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
          data: { action: 'cancel', cancelledRunId: input.runId },
          summary: `Run ${input.runId} cancelled.`,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return toolErr('PROVIDER_ERROR', `runs[${input.action}] failed: ${message}`, {
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

  const websetTools = createWebsetTools(tenantId)

  return {
    runs: runsRouter,
    'artifacts-get': artifactsGet,
    'write-plan': writePlan,
    ...websetTools,
  }
}
