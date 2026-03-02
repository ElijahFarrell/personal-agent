import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { executeOutreachCampaign } from '@/mastra/workflows/outreachCampaign'
import type { OutreachTarget } from '@/mastra/workflows/outreachCampaign'

interface OutreachRequestBody {
  targets: OutreachTarget[]
  campaignContext: string
}

/**
 * POST /api/outreach — run an outreach campaign and return drafts for review.
 * Does NOT auto-send. Sending happens in a separate step (e.g. GET /api/outreach/[id]/send).
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId } = tenantCtx

    const body = (await req.json()) as Partial<OutreachRequestBody>
    const { targets, campaignContext } = body

    if (!targets?.length) {
      return NextResponse.json(
        { error: 'targets array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!campaignContext?.trim()) {
      return NextResponse.json(
        { error: 'campaignContext is required' },
        { status: 400 }
      )
    }

    const result = await executeOutreachCampaign({
      userId,
      targets,
      campaignContext: campaignContext.trim(),
    })

    return NextResponse.json({
      ...result,
      message:
        'Drafts ready for review. Approve individually or in batch before sending.',
    })
  } catch (error) {
    console.error('[Outreach API] Error:', error)
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
