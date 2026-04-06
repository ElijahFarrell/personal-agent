import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { INBOX_PROVIDER } from '@convex/constants'
import type { Id } from '@convex/_generated/dataModel'
import { config } from '@/lib/config'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function verifyWebhook(req: NextRequest): boolean {
  const secret = config.unipile.webhookSecret.trim()
  if (!secret) return true
  const sig =
    req.headers.get('x-unipile-signature') ??
    req.headers.get('x-webhook-signature') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return sig === secret
}

/**
 * POST /api/webhooks/unipile/inbox
 * Bridges Unipile inbound messages into Convex inboxThreads + inboxMessages.
 */
export async function POST(req: NextRequest) {
  if (!verifyWebhook(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as Record<string, unknown>
    const data = (body.data as Record<string, unknown> | undefined) ?? body

    const accountId = String(
      data.account_id ?? data.accountId ?? body.account_id ?? body.accountId ?? ''
    )
    if (!accountId) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'no_account_id' })
    }

    const mapping = await convex.query(api.unipileAccounts.getByExternalAccountId, {
      externalAccountId: accountId,
    })
    if (!mapping) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'no_mapping' })
    }

    const provider =
      mapping.provider === 'linkedin'
        ? INBOX_PROVIDER.LINKEDIN
        : INBOX_PROVIDER.WHATSAPP

    const messageBody = String(
      data.text ?? data.body ?? data.message ?? data.content ?? ''
    ).trim()
    const chatId = String(
      data.chat_id ?? data.chatId ?? data.thread_id ?? data.threadId ?? ''
    )
    const sender = (data.sender as Record<string, unknown> | undefined) ?? {}
    const senderLabel = String(
      sender.name ?? sender.provider_id ?? sender.identifier ?? ''
    ).trim()
    const senderId = String(sender.id ?? sender.provider_id ?? '').trim()
    const messageId = String(
      data.message_id ?? data.messageId ?? data.id ?? `unipile_${Date.now()}`
    )
    const direction = String(data.direction ?? '').toLowerCase()
    const isOutbound =
      data.is_outbound === true || direction === 'outbound' || direction === 'sent'
    const rawTimestamp = String(
      data.timestamp ?? data.sent_at ?? data.created_at ?? data.createdAt ?? ''
    )
    const sentAt = rawTimestamp ? Date.parse(rawTimestamp) || Date.now() : Date.now()
    const externalThreadId = chatId || senderId || messageId

    if (!externalThreadId || !messageBody) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'missing_message' })
    }

    const threadId = await convex.mutation(api.inbox.upsertThread, {
      tenantId: mapping.tenantId as Id<'tenants'>,
      userId: mapping.userId as Id<'users'>,
      provider,
      externalThreadId,
      subject:
        provider === INBOX_PROVIDER.LINKEDIN
          ? `LinkedIn chat ${externalThreadId}`
          : `WhatsApp chat ${externalThreadId}`,
      snippet: messageBody.slice(0, 200),
      lastMessageAt: sentAt,
      participantEmails: senderId ? [senderId] : [],
      needsReply: !isOutbound,
    })

    await convex.mutation(api.inbox.insertMessage, {
      threadId,
      externalMessageId: messageId,
      sentAt,
      fromEmail: isOutbound ? 'you' : senderId || senderLabel || 'unknown',
      senderId: senderId || undefined,
      senderLabel: senderLabel || undefined,
      bodyPreview: messageBody,
      isOutbound,
    })

    return NextResponse.json({ ok: true, threadId })
  } catch (error) {
    console.error('[unipile/inbox-webhook]', error)
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }
}
