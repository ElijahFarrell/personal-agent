import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { sendInboxThreadReply } from '@/services/inboxReplyService'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId, config } = tenantCtx

    if (!isFeatureEnabled(config, 'unifiedInbox')) {
      return NextResponse.json({ error: 'Unified inbox is not enabled.' }, { status: 403 })
    }

    const body = (await req.json()) as {
      threadId?: string
      body?: string
    }
    const threadId = body.threadId as Id<'inboxThreads'> | undefined
    const text = typeof body.body === 'string' ? body.body : ''

    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 })
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const thread = await convex.query(api.inbox.getThread, { threadId })
    if (!thread || thread.userId !== dbUser._id) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const userEmailLower = dbUser.email.toLowerCase().trim()

    await sendInboxThreadReply({
      clerkUserId: userId,
      userEmailLower,
      thread: {
        provider: thread.provider,
        externalThreadId: thread.externalThreadId,
      },
      body: text,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send reply'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
