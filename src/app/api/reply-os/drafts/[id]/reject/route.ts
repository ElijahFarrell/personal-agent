import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { DRAFT_STATUS } from '@convex/constants'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(
  _req: NextRequest,
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
    const draftId = id as Id<'replyDrafts'>
    const draft = await convex.query(api.replyDrafts.getById, { draftId })
    if (!draft || draft.tenantId !== dbUser.tenantId) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    await convex.mutation(api.replyDrafts.setStatus, {
      draftId,
      status: DRAFT_STATUS.REJECTED,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject draft'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
