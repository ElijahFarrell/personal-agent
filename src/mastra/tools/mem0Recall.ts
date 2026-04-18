import MemoryClient from 'mem0ai'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { config } from '@/lib/config'

/**
 * mem0 recall is the companion to `mem0-memorize`. It returns durable
 * one-liner facts about the user. For session-scoped state (active runs,
 * current ICP, recent websets, the plan) use the orchestrator's
 * working memory — those fields are materialized into the system prompt
 * automatically on every turn and should never be re-fetched via mem0.
 */

const MEM0_RECALL_LIMIT = 6

const recallInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, 'Query must be at least 2 characters.')
    .max(200, 'Query must be short — a topic or question, not a paragraph.')
    .describe(
      'Topic or question to search for in long-term memory ' +
        '(e.g. "favorite outreach tone", "ICP for SDR campaigns").'
    ),
})

export function createMem0RecallTool(userId: string) {
  const client = new MemoryClient({ apiKey: config.mem0.apiKey })

  return createTool({
    id: 'mem0-recall',
    description:
      'Search long-term memory for **durable one-liner facts** about the user ' +
      '(preferences, identity, stable goals). ' +
      'DO NOT use for fetching active run status, current campaign details, or other structured state — ' +
      'those live in working memory and are already in context.',
    inputSchema: recallInputSchema,
    execute: async (input) => {
      const parsed = recallInputSchema.safeParse(input)
      if (!parsed.success) {
        return {
          memories: [],
          count: 0,
          error: parsed.error.issues.map((i) => i.message).join('; '),
        }
      }
      try {
        const results = await client.search(parsed.data.query, {
          user_id: userId,
          limit: MEM0_RECALL_LIMIT,
        })
        const memories = results
          .map((r: { memory?: string }) => (r.memory ?? '').trim())
          .filter((m) => m.length > 0)
        return { memories, count: memories.length }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { memories: [], count: 0, error: message }
      }
    },
  })
}
