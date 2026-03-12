import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AgentModels } from '@/constants/models'
import { SDR_PROMPT } from '../prompts/sdr'
import {
  searchCompaniesViaWebsets,
  fetchItemsByWebsetId,
  fetchAllPastWebsetResults,
  type ExaCompanyResult,
} from '@/services/exaWebsetsService'

const websetIdSchema = z.object({
  websetId: z.string().describe('Exa webset ID (e.g. webset_01kkddbxd2r5s9ty4nhnxvhb88) from the dashboard URL'),
})

const searchInputSchema = z.object({
  query: z.string().describe('Natural language search query for companies (e.g. AI startups in San Francisco)'),
  count: z.number().min(1).max(50).default(5).describe('Number of companies to fetch'),
})

const addToProspectsSchema = z.object({
  results: z.array(
    z.object({
      companyName: z.string(),
      email: z.string().optional(),
      linkedinUrl: z.string().optional(),
      domain: z.string().optional(),
    })
  ),
})

function formatResultsAsTable(results: ExaCompanyResult[]): string {
  if (results.length === 0) return 'No results found.'
  const rows = results.map(
    (r) =>
      `| ${r.companyName} | ${r.email ?? '-'} | ${r.linkedinUrl ?? '-'} | ${r.domain ?? '-'} |`
  )
  return (
    '| Company | Email | LinkedIn | Domain |\n' +
    '|---------|-------|----------|--------|\n' +
    rows.join('\n')
  )
}

/** Factory creates an SDR agent scoped to a user. */
export function createSDRAgent(userId: string, tenantId: string) {
  const convex =
    process.env.NEXT_PUBLIC_CONVEX_URL
      ? new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
      : null

  return new Agent({
    id: `sdr-${userId}`,
    name: 'sdr',
    instructions: SDR_PROMPT,
    model: AgentModels.content(),
    tools: {
      runExaWebsetSearch: createTool({
        id: 'run-exa-webset-search',
        description:
          'Search for companies via Exa Websets. Pass the user\'s natural language query (e.g. "AI companies in SF hiring for ML"). ' +
          'First run: use count=5 for a sample. If user wants more, run again with count=15 or 20.',
        inputSchema: searchInputSchema,
        execute: async (input) => {
          const results = await searchCompaniesViaWebsets(
            input.query,
            input.count
          )
          const table = formatResultsAsTable(results)
          const json = JSON.stringify(results)
          return `Found ${results.length} companies.\n\n${table}\n\n---\nRaw results (for addExaResultsToProspects):\n\`\`\`json\n${json}\n\`\`\``
        },
      }),

      addExaResultsToProspects: createTool({
        id: 'add-exa-results-to-prospects',
        description:
          'Add Exa search results to the user\'s Prospects page. Call this when the user approves adding the companies. ' +
          'Pass the results array from the previous runExaWebsetSearch output.',
        inputSchema: addToProspectsSchema,
        execute: async (input) => {
          if (!convex || input.results.length === 0) {
            return 'Could not add to prospects: no Convex client or empty results.'
          }
          const count = await convex.mutation(api.prospects.importFromExa, {
            tenantId: tenantId as Id<'tenants'>,
            rows: input.results.map((r) => ({
              companyName: r.companyName,
              email: r.email,
              linkedinUrl: r.linkedinUrl,
              domain: r.domain,
            })),
          })
          return `Added ${count} companies to your Prospects page.`
        },
      }),

      fetchExaWebsetById: createTool({
        id: 'fetch-exa-webset-by-id',
        description:
          'Fetch results from a past Exa webset by ID. Use when the user pastes a webset ID from the Exa dashboard (e.g. webset_01kkddbxd2r5s9ty4nhnxvhb88). ' +
          'Returns a table and raw JSON for addExaResultsToProspects.',
        inputSchema: websetIdSchema.extend({
          limit: z.number().min(1).max(100).optional().default(50),
        }),
        execute: async (input) => {
          const results = await fetchItemsByWebsetId(input.websetId, input.limit)
          const table = formatResultsAsTable(results)
          const json = JSON.stringify(results)
          return `Found ${results.length} companies in webset ${input.websetId}.\n\n${table}\n\n---\nRaw results (for addExaResultsToProspects):\n\`\`\`json\n${json}\n\`\`\``
        },
      }),

      addExaWebsetToProspects: createTool({
        id: 'add-exa-webset-to-prospects',
        description:
          'Add a past Exa webset directly to Prospects by webset ID. Use when the user wants to add results from the Exa dashboard (e.g. "add webset_xxx to my prospects"). ' +
          'Fetches items from the webset and imports them in one step.',
        inputSchema: websetIdSchema.extend({
          limit: z.number().min(1).max(100).optional().default(100),
        }),
        execute: async (input) => {
          if (!convex) return 'Could not add to prospects: no Convex client.'
          const results = await fetchItemsByWebsetId(input.websetId, input.limit)
          if (results.length === 0) return `No companies found in webset ${input.websetId}.`
          const count = await convex.mutation(api.prospects.importFromExa, {
            tenantId: tenantId as Id<'tenants'>,
            rows: results.map((r) => ({
              companyName: r.companyName,
              email: r.email,
              linkedinUrl: r.linkedinUrl,
              domain: r.domain,
            })),
          })
          return `Added ${count} companies from webset ${input.websetId} to your Prospects page.`
        },
      }),

      fetchAllPastWebsetResults: createTool({
        id: 'fetch-all-past-webset-results',
        description:
          'List all Exa websets and fetch results from each. Use when the user asks for "all my past Exa searches", "list my websets", "get all past results", or "show me everything from my Exa dashboard". ' +
          'Returns webset IDs, a combined deduplicated table of all companies, and raw JSON for addExaResultsToProspects.',
        inputSchema: z.object({
          itemsPerWebset: z.number().min(1).max(100).optional().default(100),
        }),
        execute: async (input) => {
          const { websets, results } = await fetchAllPastWebsetResults(
            input.itemsPerWebset
          )
          const idsBlock =
            websets.length > 0
              ? `**Webset IDs (${websets.length} total):**\n${websets
                  .map(
                    (w) =>
                      `- ${w.id} (created ${w.createdAt}) ${w.dashboardUrl ? `[Dashboard](${w.dashboardUrl})` : ''}`
                  )
                  .join('\n')}\n\n`
              : 'No websets found.\n\n'
          const table = formatResultsAsTable(results)
          const json = JSON.stringify(results)
          return `${idsBlock}**Combined results (${results.length} companies, deduplicated):**\n\n${table}\n\n---\nRaw results (for addExaResultsToProspects):\n\`\`\`json\n${json}\n\`\`\``
        },
      }),
    },
  })
}
