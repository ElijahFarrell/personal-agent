import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { searchExaDeep } from '@/services/searchService'

/**
 * Reddit-focused search tool. Uses Exa with domain filtering to surface
 * authentic discussions, sentiment, and ground-truth opinions from Reddit.
 */
export const redditSearchTool = createTool({
  id: 'reddit-search',
  description:
    'Search Reddit for authentic discussions, opinions, reviews, and market sentiment. ' +
    'Great for finding real user experiences, niche community insights, business sentiment, ' +
    'product feedback, and unfiltered market perspectives.',
  inputSchema: z.object({
    query: z.string().describe('Search query — phrase it as what people would discuss on Reddit'),
    subreddits: z
      .array(z.string())
      .optional()
      .describe('Specific subreddits to search (e.g. ["wallstreetbets", "investing", "startups"])'),
    maxAgeHours: z
      .number()
      .optional()
      .default(168)
      .describe('Max age of results in hours (default 168 = 7 days). Use 24 for very fresh.'),
    numResults: z
      .number()
      .min(1)
      .max(15)
      .optional()
      .default(8)
      .describe('Number of results (1-15)'),
  }),
  execute: async ({ query, subreddits, maxAgeHours, numResults }) => {
    try {
      const domains = subreddits?.length
        ? subreddits.map((s) => `reddit.com/r/${s}`)
        : ['reddit.com']

      const results = await searchExaDeep(query, {
        numResults,
        maxCharacters: 2000,
        includeDomains: domains,
        maxAgeHours,
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
      const message = error instanceof Error ? error.message : 'Reddit search failed'
      return { results: [], count: 0, error: message }
    }
  },
})
