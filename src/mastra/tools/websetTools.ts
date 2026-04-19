import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ToolResult } from '@/types'

/**
 * Webset cache tools — read the pre-synced `websetItems` Convex table instead
 * of hitting Exa on every turn. Populated by the hourly `pullPastWebsets`
 * internal action (see {@link file://./../convex/agentWorkers.ts}).
 *
 * Kept in its own module so both the orchestrator (directly) and the SDR +
 * Lead sub-agents (via the internal MCP client's `exa` domain) can mount the
 * same factory without reaching into unrelated tool files.
 */

function getConvex(): ConvexHttpClient | null {
  return process.env.NEXT_PUBLIC_CONVEX_URL
    ? new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
    : null
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

const WebsetPreviewEntrySchema = z.object({
  companyName: z.string(),
  domain: z.string().optional(),
  email: z.string().optional(),
})

export const WebsetSummarySchema = z.object({
  websetId: z.string(),
  websetTitle: z.string().optional(),
  sourceRunId: z.string().optional(),
  count: z.number(),
  newestAt: z.number(),
  preview: z.array(WebsetPreviewEntrySchema),
})

function toolErr(
  code: string,
  message: string,
  extras: { retryable?: boolean; details?: Record<string, unknown> } = {}
): { ok: false; error: { code: string; message: string; retryable?: boolean; details?: Record<string, unknown> } } {
  return { ok: false, error: { code, message, ...extras } }
}

const ListRecentInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of websets to return. Defaults to 10.'),
  since: z
    .string()
    .datetime()
    .optional()
    .describe(
      'ISO-8601 timestamp. Only websets with items updated at or after this time are returned. ' +
        'Use for time-range asks like "today", "yesterday", or "last 24 hours".'
    ),
})

/**
 * Factory for the shared webset cache tools. Scoped to a tenant so the LLM
 * can only ever read rows that belong to the current session.
 */
export function createWebsetTools(tenantId: string) {
  const convex = getConvex()

  const listRecentWebsets = createTool({
    id: 'list-recent-websets',
    description:
      'List recently synced Exa webset searches for this tenant, with item counts and a short ' +
      "preview of companies. Cached in Convex — cheap to call, safe during Exa outages, and won't " +
      "hit the chat's time budget. Pass `since` to answer time-range asks like \"today\" or " +
      '"yesterday" without loading the whole history.',
    inputSchema: ListRecentInputSchema,
    outputSchema: makeResultSchema(
      z.object({ websets: z.array(WebsetSummarySchema) })
    ),
    execute: async (
      input
    ): Promise<ToolResult<{ websets: z.infer<typeof WebsetSummarySchema>[] }>> => {
      if (!convex) return toolErr('INTERNAL', 'No Convex client configured.')
      try {
        const sinceMs =
          input.since !== undefined ? Date.parse(input.since) : undefined
        if (sinceMs !== undefined && Number.isNaN(sinceMs)) {
          return toolErr('VALIDATION', `Could not parse "since" as ISO-8601: ${input.since}`)
        }
        const rows = (await convex.query(api.websetItems.listRecent, {
          tenantId: tenantId as Id<'tenants'>,
          limit: input.limit,
          sinceMs,
        })) as z.infer<typeof WebsetSummarySchema>[]
        const totalItems = rows.reduce((n, w) => n + w.count, 0)
        const windowLabel = input.since ? ` since ${input.since}` : ''
        return {
          ok: true,
          data: { websets: rows },
          summary: `${rows.length} past webset${rows.length === 1 ? '' : 's'}${windowLabel} (${totalItems} items total).`,
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
    'list-recent-websets': listRecentWebsets,
  }
}
