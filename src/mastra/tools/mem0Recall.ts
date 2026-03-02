import MemoryClient from 'mem0ai'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { config } from '@/lib/config'

export function createMem0RecallTool(userId: string) {
  const client = new MemoryClient({ apiKey: config.mem0.apiKey })

  return createTool({
    id: 'mem0-recall',
    description:
      'Search long-term memory for relevant facts, preferences, or past context. ' +
      'Use this at the start of any task that might benefit from past context — ' +
      "user preferences, ongoing projects, pipeline state, or 'what did I do last time'.",
    inputSchema: z.object({
      query: z
        .string()
        .describe('What to search for in long-term memory'),
    }),
    execute: async (input) => {
      try {
        const results = await client.search(input.query, {
          filters: { user_id: userId },
          limit: 8,
        })
        const memories = results.map((r: { memory?: string }) => r.memory ?? '')
        return { memories, count: memories.length }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { memories: [], count: 0, error: message }
      }
    },
  })
}
