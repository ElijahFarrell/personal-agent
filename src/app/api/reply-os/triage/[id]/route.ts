import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { TRIAGE_STATUS } from '@convex/constants'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const STATUS_VALUES = new Set<string>(Object.values(TRIAGE_STATUS))

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, config } = await getTenantContext()
    if (!isFeatureEnabled(config, 'sellerReplyOs')) {
      return NextResponse.json(
        { error: 'Seller Reply OS is not enabled.' },
        { status: 403 }
      )
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const { id } = await params
    const triageId = id as Id<'replyTriage'>
    const triage = await convex.query(api.replyTriage.getById, { triageId })
    if (!triage || triage.tenantId !== dbUser.tenantId) {
      return NextResponse.json({ error: 'Triage not found' }, { status: 404 })
    }

    const body = (await req.json()) as {
      status?: string
      snoozedUntil?: number
    }
    if (!body.status || !STATUS_VALUES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const result = await convex.mutation(api.replyTriage.setStatus, {
      triageId,
      status: body.status as (typeof TRIAGE_STATUS)[keyof typeof TRIAGE_STATUS],
      snoozedUntil:
        typeof body.snoozedUntil === 'number' ? body.snoozedUntil : undefined,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update triage'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
