import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'
import { processThreadReply } from '@/services/replyOs/ingest'

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
    const threadId = id as Id<'inboxThreads'>
    const thread = await convex.query(api.inbox.getThread, { threadId })
    if (!thread || thread.tenantId !== dbUser.tenantId) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const result = await processThreadReply({
      tenantId: dbUser.tenantId,
      threadId,
      force: true,
    })
    return NextResponse.json({ ok: true, triageId: result?.triageId ?? null })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reclassify thread'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
