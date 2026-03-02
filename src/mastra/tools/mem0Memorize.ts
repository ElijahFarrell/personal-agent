import MemoryClient from 'mem0ai'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { config } from '@/lib/config'

export function createMem0MemorizeTool(userId: string) {
  const client = new MemoryClient({ apiKey: config.mem0.apiKey })

  return createTool({
    id: 'mem0-memorize',
    description:
      'Save an important fact, preference, task, or piece of context to long-term memory. ' +
      'Use this when the user shares personal preferences, important facts, pipeline updates, ' +
      'ongoing projects, or anything worth remembering in future sessions.',
    inputSchema: z.object({
      statement: z
        .string()
        .describe('The fact or information to commit to long-term memory'),
    }),
    execute: async (input) => {
      try {
        await client.add([{ role: 'user', content: input.statement }], {
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
