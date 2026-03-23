import type { Id } from '@convex/_generated/dataModel'
import { ADS_PIPELINE_RUN_STATUS } from '@convex/constants'
import type { AdsPipelineInput } from './contracts'
import { PLATFORM_DEFAULT_ENGINE, type AdsPlatform, type SearchApiEngine } from './contracts'
import { scrapeEnginesParallel } from './searchApiScrapeService'
import { analyzeAdsFromScrape } from './analyzeService'
import { buildCampaignBrief } from './buildService'
import { patchAdsPipelineRun } from './runsService'

export interface RunAdsIntelligenceOptions extends AdsPipelineInput {
  clerkUserId: string
  runId: Id<'adsPipelineRuns'>
}

/**
 * Executes scrape → analyze → build with Convex status updates for UI progress.
 */
export async function runAdsIntelligenceWithProgress(
  opts: RunAdsIntelligenceOptions
): Promise<void> {
  const { clerkUserId, runId, query, platforms, focusArea, businessProfile } = opts

  const engines: SearchApiEngine[] = platforms.map(
    (p: AdsPlatform) => PLATFORM_DEFAULT_ENGINE[p]
  )

  await patchAdsPipelineRun(runId, {
    status: ADS_PIPELINE_RUN_STATUS.SCRAPING,
    currentStage: 'scraping',
  })

  const scrape = await scrapeEnginesParallel(clerkUserId, query, engines)

  await patchAdsPipelineRun(runId, {
    status: ADS_PIPELINE_RUN_STATUS.ANALYZING,
    currentStage: 'analyzing',
    completedEngines: scrape.completedEngines,
    cachedSearchRefs: scrape.refs,
  })

  const analysis = await analyzeAdsFromScrape(clerkUserId, scrape, focusArea)

  await patchAdsPipelineRun(runId, {
    status: ADS_PIPELINE_RUN_STATUS.BUILDING,
    currentStage: 'building',
    analysisMarkdown: analysis.markdown,
  })

  const campaign = await buildCampaignBrief(analysis, businessProfile)

  const now = Date.now()
  await patchAdsPipelineRun(runId, {
    status: ADS_PIPELINE_RUN_STATUS.COMPLETED,
    currentStage: 'completed',
    campaignBriefMarkdown: campaign.markdown,
    completedAt: now,
  })
}
