import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { searchExaDeep } from '@/services/searchService'

/**
 * News-focused search tool for current events, market news, and breaking stories.
 * Uses Exa with the "news" category for high-quality journalism sources.
 */
export const newsSearchTool = createTool({
  id: 'news-search',
  description:
    'Search for current news, market updates, industry reports, and breaking stories. ' +
    'Optimized for journalism sources. Use for market movements, earnings, regulatory changes, ' +
    'funding rounds, IPOs, and sector-level trends.',
  inputSchema: z.object({
    query: z.string().describe('News search query'),
    domains: z
      .array(z.string())
      .optional()
      .describe('Target specific news outlets (e.g. ["reuters.com", "bloomberg.com", "cnbc.com"])'),
    hoursBack: z
      .number()
      .optional()
      .default(72)
      .describe('How far back to search in hours (default 72 = 3 days)'),
    numResults: z
      .number()
      .min(1)
      .max(15)
      .optional()
      .default(8)
      .describe('Number of results (1-15)'),
  }),
  execute: async ({ query, domains, hoursBack, numResults }) => {
    try {
      const results = await searchExaDeep(query, {
        numResults,
        maxCharacters: 2000,
        category: 'news',
        includeDomains: domains,
        maxAgeHours: hoursBack,
      })
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
      const message = error instanceof Error ? error.message : 'News search failed'
      return { results: [], count: 0, error: message }
    }
  },
})
