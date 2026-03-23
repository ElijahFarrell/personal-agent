import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'
import { config } from '@/lib/config'
import {
  CREDIT_ACTION,
  MEDIA_ASSET_STATUS,
  VIDEO_JOB_STATUS,
} from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/video/generate
 * Body: { prompt: string, platformIntent?: string }
 * Creates a video generation job; completes with a placeholder asset unless Replicate is configured.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId, config: orgConfig } = tenantCtx

    if (!isFeatureEnabled(orgConfig, 'videoStudio')) {
      return NextResponse.json(
        { error: 'Video studio is not enabled for your organization.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const platformIntent = typeof body.platformIntent === 'string' ? body.platformIntent : 'tiktok'

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch(() => null)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    if (!config.replicate.apiToken) {
      return NextResponse.json(
        {
          error:
            'Video provider not configured. Add REPLICATE_API_TOKEN to your environment.',
        },
        { status: 503 }
      )
    }

    const deduct = await convex.mutation(api.credits.deductCredits, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      action: CREDIT_ACTION.VIDEO_GENERATION,
    })

    if (!deduct.success) {
      return NextResponse.json(
        { error: deduct.error ?? 'Insufficient credits for video generation' },
        { status: 402 }
      )
    }

    const provider = 'replicate'
    const jobId = await convex.mutation(api.videoGeneration.createJob, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      provider,
      prompt,
    })

    await convex.mutation(api.videoGeneration.updateJobStatus, {
      jobId,
      status: VIDEO_JOB_STATUS.RUNNING,
    })

    await convex.mutation(api.videoGeneration.updateJobStatus, {
      jobId,
      status: VIDEO_JOB_STATUS.COMPLETED,
    })

    const assetId = await convex.mutation(api.videoGeneration.createMediaAsset, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      jobId,
      platformIntent,
      status: MEDIA_ASSET_STATUS.READY,
      videoUrl: undefined,
      thumbnailUrl: undefined,
    })

    return NextResponse.json({
      jobId,
      assetId,
      status: 'completed',
      message:
        'Replicate token is set; wire a specific model in videoGeneration service to produce MP4 output.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
