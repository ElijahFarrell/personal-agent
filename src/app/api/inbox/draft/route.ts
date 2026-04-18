import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { buildReplyContextPrompt } from '@/services/replyContextService'
import { createEmailAgent } from '@/mastra/agents/emailAgent'
import { createMessagingAgent } from '@/mastra/agents/messagingAgent'
import { getComposioConnectionStatus } from '@/lib/composio'

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
      mode?: 'reply' | 'summarize'
    }
    const threadId = body.threadId as Id<'inboxThreads'> | undefined
    const mode = body.mode ?? 'reply'

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

    const contextBlock = await buildReplyContextPrompt({
      threadId,
      orgReplyVoice: config.orgReplyVoice,
      clerkUserId: userId,
      userEmailLower,
    })

    const status = await getComposioConnectionStatus(userId)
    const connected = Object.entries(status)
      .filter(([, v]) => v)
      .map(([k]) => k)

    const task =
      mode === 'summarize'
        ? `Summarize this conversation for the user in 5–8 bullet points. Focus on commitments, open questions, and next steps. Use only the context below.\n\n${contextBlock}`
        : `Draft the next message to send in this conversation. Show the full draft text only (no send). Use the correct channel style for ${thread.provider}. Ground every sentence in the thread and prospect context below; avoid generic filler.\n\n${contextBlock}`

    let text: string
    if (thread.provider === 'whatsapp') {
      const { agent } = await createMessagingAgent(
        userId,
        connected,
        undefined,
        String(dbUser.tenantId)
      )
      const result = await agent.generate(task)
      text = result.text
    } else {
      const { agent } = await createEmailAgent(
        userId,
        connected,
        undefined,
        String(dbUser.tenantId)
      )
      const result = await agent.generate(task)
      text = result.text
    }

    await convex.mutation(api.inboxAiUsage.record, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      kind: mode === 'summarize' ? 'summarize' : 'draft_reply',
    })

    return NextResponse.json({ text, mode })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Draft failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
