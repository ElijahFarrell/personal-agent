/**
 * Competitive ads intelligence: parallel multi-engine scrape → analysis → campaign brief.
 */
import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import {
  AdsPipelineInputSchema,
  AdsPipelineRunOutputSchema,
  PLATFORM_DEFAULT_ENGINE,
  type AdsPlatform,
  type SearchApiEngine,
} from '@/services/adsIntelligence/contracts'
import { scrapeEnginesParallel } from '@/services/adsIntelligence/searchApiScrapeService'
import { analyzeAdsFromScrape } from '@/services/adsIntelligence/analyzeService'
import { buildCampaignBrief } from '@/services/adsIntelligence/buildService'

const workflowInputSchema = AdsPipelineInputSchema.extend({
  clerkUserId: z.string(),
})

const scrapeOutputSchema = z.object({
  requestedEngines: z.array(z.string()),
  completedEngines: z.array(z.string()),
  refs: z.array(
    z.object({
      engine: z.string(),
      searchId: z.string(),
      ok: z.boolean(),
      error: z.optional(z.string()),
    })
  ),
})

const scrapeStep = createStep({
  id: 'ads-scrape',
  description: 'Parallel SEARCH_API_SEARCH per ad-library engine',
  inputSchema: workflowInputSchema,
  outputSchema: scrapeOutputSchema,
  execute: async ({ inputData }) => {
    const engines: SearchApiEngine[] = inputData.platforms.map(
      (p: AdsPlatform) => PLATFORM_DEFAULT_ENGINE[p]
    )
    const result = await scrapeEnginesParallel(inputData.clerkUserId, inputData.query, engines)
    return {
      requestedEngines: result.requestedEngines,
      completedEngines: result.completedEngines,
      refs: result.refs,
    }
  },
})

const analyzeStep = createStep({
  id: 'ads-analyze',
  description: 'Load cached results and synthesize competitive analysis',
  inputSchema: scrapeOutputSchema,
  outputSchema: z.object({
    markdown: z.string(),
    scrape: scrapeOutputSchema,
  }),
  execute: async ({ inputData, getInitData }) => {
    const init = getInitData<z.infer<typeof workflowInputSchema>>()
    const scrape = {
      refs: inputData.refs,
      requestedEngines: inputData.requestedEngines,
      completedEngines: inputData.completedEngines,
    }
    const analysis = await analyzeAdsFromScrape(
      init.clerkUserId,
      scrape,
      init.focusArea
    )
    return { markdown: analysis.markdown, scrape: inputData }
  },
})

const buildStep = createStep({
  id: 'ads-build-campaign',
  description: 'Turn analysis into a campaign brief',
  inputSchema: z.object({
    markdown: z.string(),
    scrape: scrapeOutputSchema,
  }),
  outputSchema: AdsPipelineRunOutputSchema,
  execute: async ({ inputData, getInitData }) => {
    const init = getInitData<z.infer<typeof workflowInputSchema>>()
    const campaign = await buildCampaignBrief(
      { markdown: inputData.markdown },
      init.businessProfile,
      init.clerkUserId
    )
    return {
      scrape: {
        refs: inputData.scrape.refs,
        requestedEngines: inputData.scrape.requestedEngines,
        completedEngines: inputData.scrape.completedEngines,
      },
      analysis: { markdown: inputData.markdown },
      campaign,
    }
  },
})

export const adsIntelligenceWorkflow = createWorkflow({
  id: 'ads-intelligence',
  description:
    'End-to-end competitive ads pipeline: parallel ad-library search (Search API), analysis, and campaign brief. Requires Search API connected.',
  inputSchema: workflowInputSchema,
  outputSchema: AdsPipelineRunOutputSchema,
})
  .then(scrapeStep)
  .then(analyzeStep)
  .then(buildStep)
  .commit()

export type AdsIntelligenceWorkflowInput = z.infer<typeof workflowInputSchema>
export type AdsIntelligenceWorkflowOutput = z.infer<typeof AdsPipelineRunOutputSchema>

/**
 * Plain async runner for API routes (same stages as the Mastra workflow graph).
 */
export async function executeAdsIntelligencePipeline(
  input: AdsIntelligenceWorkflowInput
): Promise<AdsIntelligenceWorkflowOutput> {
  const engines: SearchApiEngine[] = input.platforms.map(
    (p: AdsPlatform) => PLATFORM_DEFAULT_ENGINE[p]
  )
  const scrape = await scrapeEnginesParallel(input.clerkUserId, input.query, engines)
  const analysis = await analyzeAdsFromScrape(input.clerkUserId, scrape, input.focusArea)
  const campaign = await buildCampaignBrief(
    analysis,
    input.businessProfile,
    input.clerkUserId
  )
  return { scrape, analysis, campaign }
}
