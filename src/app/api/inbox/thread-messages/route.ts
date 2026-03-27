import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { fetchLiveThreadMessages } from '@/services/inboxLiveMessagesService'
import { INBOX_PROVIDER } from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId, config } = tenantCtx

    if (!isFeatureEnabled(config, 'unifiedInbox')) {
      return NextResponse.json({ error: 'Unified inbox is not enabled.' }, { status: 403 })
    }

    const threadIdParam = req.nextUrl.searchParams.get('threadId')
    if (!threadIdParam) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 })
    }

    const threadId = threadIdParam as Id<'inboxThreads'>

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

    if (thread.provider === INBOX_PROVIDER.WHATSAPP) {
      const rows = await convex.query(api.inbox.listMessagesForThread, {
        threadId,
        limit: 200,
      })
      return NextResponse.json({
        source: 'convex' as const,
        messages: (rows ?? []).map((m) => ({
          externalMessageId: m.externalMessageId,
          sentAt: m.sentAt,
          fromEmail: m.fromEmail,
          isOutbound: m.isOutbound,
          bodyPlain: m.bodyPreview,
          senderLabel: m.senderLabel,
        })),
      })
    }

    const messages = await fetchLiveThreadMessages(
      userId,
      thread.provider,
      thread.externalThreadId,
      userEmailLower
    )

    return NextResponse.json({
      source: 'composio' as const,
      messages: messages.map((m) => ({
        externalMessageId: m.externalMessageId,
        sentAt: m.sentAt,
        fromEmail: m.fromEmail,
        isOutbound: m.isOutbound,
        bodyPlain: m.bodyPlain,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load messages'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
