import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { search } from '@/services/searchService'

/**
 * Mastra tool for web search. Uses Tavily (fast) or Exa (deep) based on query.
 */
export const webSearchTool = createTool({
  id: 'web-search',
  description:
    'Fast web search (Tavily) or Exa deep search. **Prefer this tool** for most lookups — it is faster than delegating to the research-agent. ' +
    'Use **fast** (default) for quick facts, news, and validation. Use **deep** (Exa) for richer page content, company research, and prospect background before outreach.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    type: z
      .enum(['fast', 'deep'])
      .optional()
      .default('fast')
      .describe(
        "'fast' = Tavily (quick). 'deep' = Exa with extracted text — use for substantive research on a company or person."
      ),
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
