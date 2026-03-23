import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ADS_PIPELINE_RUN_STATUS } from '@convex/constants'

const client = () => new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function createAdsPipelineRunRecord(
  tenantId: Id<'tenants'>,
  userId: Id<'users'>,
  params: {
    query: string
    platforms: string[]
    focusArea?: string
    requestedEngines: string[]
  }
): Promise<Id<'adsPipelineRuns'>> {
  return await client().mutation(api.adsPipelineRuns.createRun, {
    tenantId,
    userId,
    query: params.query,
    platforms: params.platforms,
    focusArea: params.focusArea,
    requestedEngines: params.requestedEngines,
  })
}

type RunStatus = (typeof ADS_PIPELINE_RUN_STATUS)[keyof typeof ADS_PIPELINE_RUN_STATUS]

export async function patchAdsPipelineRun(
  runId: Id<'adsPipelineRuns'>,
  patch: {
    status?: RunStatus
    currentStage?: string
    completedEngines?: string[]
    cachedSearchRefs?: Array<{
      engine: string
      searchId: string
      ok: boolean
      error?: string
    }>
    analysisMarkdown?: string
    campaignBriefMarkdown?: string
    error?: string
    completedAt?: number
  }
): Promise<void> {
  await client().mutation(api.adsPipelineRuns.patchRunProgress, {
    runId,
    ...patch,
  })
}
