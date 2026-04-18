import MemoryClient from 'mem0ai'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { config } from '@/lib/config'

/**
 * mem0 is now scoped to *durable one-liner facts* only — stable things about
 * the user that should outlive the current thread (preferences, identity,
 * long-term business facts, ICP hints, timezone, tooling choices).
 *
 * Anything structured/session-scoped (active run ids, ICP drafts, current
 * campaign, plan steps, recent websets) belongs in the orchestrator's
 * `workingMemory` (see src/mastra/memory/workingMemory.ts). Keeping mem0
 * narrow prevents it from turning into a dumping ground that re-hydrates
 * noisy context on every turn.
 */

const MEM0_MAX_STATEMENT_LENGTH = 280

const memorizeInputSchema = z.object({
  statement: z
    .string()
    .trim()
    .min(6, 'Statement must be at least 6 characters.')
    .max(
      MEM0_MAX_STATEMENT_LENGTH,
      `Statement must be a single sentence (<= ${MEM0_MAX_STATEMENT_LENGTH} chars). ` +
        'Structured or long-form state belongs in working memory, not mem0.'
    )
    .refine((v) => !/[\n\r]/.test(v), {
      message:
        'Multi-line content is not allowed — mem0 is for one-liner facts. Use working memory for structured state.',
    })
    .refine((v) => !isLikelyJson(v), {
      message:
        'Structured JSON-like content is not allowed in mem0 — use working memory or an artifact instead.',
    })
    .describe(
      'A single-sentence durable fact about the user or business ' +
        '(preference, identity, stable context). Max ~280 chars.'
    ),
})

function isLikelyJson(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length < 4) return false
  const first = trimmed[0]
  const last = trimmed[trimmed.length - 1]
  return (
    (first === '{' && last === '}') ||
    (first === '[' && last === ']')
  )
}

export function createMem0MemorizeTool(userId: string) {
  const client = new MemoryClient({ apiKey: config.mem0.apiKey })

  return createTool({
    id: 'mem0-memorize',
    description:
      'Save a **durable one-liner fact** about the user or their business to long-term memory ' +
      '(preferences, identity, stable goals, tooling choices, ICP hints). ' +
      'DO NOT use for session state, active runs, current campaigns, ICP drafts, or structured data — ' +
      'that belongs in working memory. Keep each fact short (≤ 280 chars), single-sentence, no JSON.',
    inputSchema: memorizeInputSchema,
    execute: async (input) => {
      const parsed = memorizeInputSchema.safeParse(input)
      if (!parsed.success) {
        return {
          success: false,
          message: parsed.error.issues.map((i) => i.message).join('; '),
        }
      }
      try {
        await client.add([{ role: 'user', content: parsed.data.statement }], {
          user_id: userId,
        })
        return { success: true, message: 'Saved to memory.' }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, message }
      }
    },
  })
}
