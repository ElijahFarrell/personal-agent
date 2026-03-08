import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { searchExaDeep } from '@/services/searchService'

/**
 * Deep research tool using Exa with category filtering, domain targeting,
 * date ranges, and live-crawl support for comprehensive analysis.
 */
export const deepSearchTool = createTool({
  id: 'deep-search',
  description:
    'Deep web search with advanced filtering for thorough research. ' +
    'Supports category filtering (news, financial reports, research papers, companies), ' +
    'domain targeting, date ranges, and live content. Use for market analysis, ' +
    'competitive intelligence, and in-depth investigation.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    category: z
      .enum(['news', 'research paper', 'financial report', 'company', 'tweet'])
      .optional()
      .describe('Focus on a specific content category'),
    includeDomains: z
      .array(z.string())
      .optional()
      .describe('Only search these domains (e.g. ["bloomberg.com", "techcrunch.com"])'),
    excludeDomains: z
      .array(z.string())
      .optional()
      .describe('Exclude these domains from results'),
    startPublishedDate: z
      .string()
      .optional()
      .describe('ISO date string — only return content published after this date'),
    endPublishedDate: z
      .string()
      .optional()
      .describe('ISO date string — only return content published before this date'),
    numResults: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .default(10)
      .describe('Number of results to return (1-20)'),
    liveCrawl: z
      .boolean()
      .optional()
      .default(false)
      .describe('Force live crawl for real-time data (slower but fresher)'),
  }),
  execute: async ({ query, category, includeDomains, excludeDomains, startPublishedDate, endPublishedDate, numResults, liveCrawl }) => {
    try {
      const results = await searchExaDeep(query, {
        numResults,
        maxCharacters: 3000,
        category,
        includeDomains,
        excludeDomains,
        startPublishedDate,
        endPublishedDate,
        maxAgeHours: liveCrawl ? 0 : undefined,
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
      const message = error instanceof Error ? error.message : 'Deep search failed'
      return { results: [], count: 0, error: message }
    }
  },
})
