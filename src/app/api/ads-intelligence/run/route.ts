import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import { isIntegrationAllowed } from '@/constants/featureGating'
import { getComposioConnectionStatus } from '@/lib/composio'
import { AdsPipelineInputSchema, PLATFORM_DEFAULT_ENGINE } from '@/services/adsIntelligence/contracts'
import { createAdsPipelineRunRecord, patchAdsPipelineRun } from '@/services/adsIntelligence/runsService'
import { runAdsIntelligenceWithProgress } from '@/services/adsIntelligence/pipelineRunner'
import { ADS_PIPELINE_RUN_STATUS } from '@convex/constants'
import { CHAT_CREDIT_ACTION } from '@/constants/chat'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/ads-intelligence/run
 * Body: AdsPipelineInput — query, platforms[], optional focusArea, businessProfile
 * Runs scrape → analyze → build and updates adsPipelineRuns for progress.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId, config } = tenantCtx

    if (!isIntegrationAllowed(config, 'searchApi')) {
      return NextResponse.json(
        { error: 'Search API is not enabled for your organization.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = AdsPipelineInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const composio = await getComposioConnectionStatus(userId)
    if (!composio.searchApi) {
      return NextResponse.json(
        {
          error:
            'Connect Search API under Integrations (API key) before running competitive ads workflows.',
        },
        { status: 400 }
      )
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const deduct = await convex.mutation(api.credits.deductCredits, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      action: CHAT_CREDIT_ACTION,
    })
    if (!deduct.success) {
      return NextResponse.json(
        { error: deduct.error ?? 'Insufficient credits' },
        { status: 402 }
      )
    }

    const requestedEngines = parsed.data.platforms.map((p) => PLATFORM_DEFAULT_ENGINE[p])

    const runId = await createAdsPipelineRunRecord(dbUser.tenantId, dbUser._id, {
      query: parsed.data.query,
      platforms: parsed.data.platforms,
      focusArea: parsed.data.focusArea,
      requestedEngines,
    })

    try {
      await runAdsIntelligenceWithProgress({
        clerkUserId: userId,
        runId,
        query: parsed.data.query,
        platforms: parsed.data.platforms,
        focusArea: parsed.data.focusArea,
        businessProfile: parsed.data.businessProfile,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Pipeline failed'
      await patchAdsPipelineRun(runId, {
        status: ADS_PIPELINE_RUN_STATUS.FAILED,
        error: msg,
        completedAt: Date.now(),
      })
      return NextResponse.json({ error: msg, runId }, { status: 500 })
    }

    return NextResponse.json({ ok: true, runId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
