import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { search } from '@/services/searchService'

/**
 * Mastra tool for web search. Uses Tavily (fast) or Exa (deep) based on query.
 */
export const webSearchTool = createTool({
  id: 'web-search',
  description:
    'Search the web for current information, news, research, or facts. ' +
    'Use for research before drafting content or outreach, finding recent news, or validating claims.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    type: z
      .enum(['fast', 'deep'])
      .optional()
      .default('fast')
      .describe("'fast' for quick lookups, 'deep' for research with richer content"),
  }),
  execute: async ({ query, type }) => {
    try {
      const results = await search(query, type)
      return {
        results: results.map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        })),
        count: results.length,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed'
      return { results: [], count: 0, error: message }
    }
  },
})
