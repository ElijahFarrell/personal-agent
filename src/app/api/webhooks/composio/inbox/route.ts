import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { INBOX_PROVIDER } from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Composio trigger target for near-real-time inbox (WhatsApp, SMS, etc.).
 * Bridges incoming messages into inboxThreads/inboxMessages for live display.
 */
export async function POST(req: NextRequest) {
  const secret =
    process.env.COMPOSIO_INBOX_WEBHOOK_SECRET ?? process.env.COMPOSIO_WEBHOOK_SECRET
  const sig =
    req.headers.get('x-composio-signature') ?? req.headers.get('x-webhook-signature')
  if (secret && sig !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const raw = await req.text()
    let body: Record<string, unknown>
    try {
      body = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const data = (body.data ?? body) as Record<string, unknown>
    const toolkit = String(body.toolkit ?? body.app_name ?? '').toLowerCase()

    const tenantId = data.tenantId as string | undefined
    const userId = data.userId as string | undefined

    if (!tenantId || !userId) {
      if (process.env.NODE_ENV === 'development') {
        console.info('[composio/inbox] missing tenantId/userId, keys:', Object.keys(body))
      }
      return NextResponse.json({ ok: true, ignored: true, reason: 'no_tenant_or_user' })
    }

    const isWhatsApp = toolkit.includes('whatsapp')
    const provider = isWhatsApp ? INBOX_PROVIDER.WHATSAPP : INBOX_PROVIDER.SMS

    const phone = String(data.from ?? data.sender ?? data.phone ?? '')
    const messageBody = String(data.body ?? data.text ?? data.message ?? '')
    const externalMessageId = String(
      data.message_id ?? data.messageId ?? data.id ?? `wa_${Date.now()}`
    )
    const isOutbound = data.direction === 'outbound' || data.is_outbound === true
    const now = Date.now()

    if (!phone && !messageBody) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'no_phone_or_body' })
    }

    const threadExternalId = phone || externalMessageId
    const prospectId =
      typeof data.prospectId === 'string'
        ? (data.prospectId as Id<'prospects'>)
        : undefined

    const threadId = await convex.mutation(api.inbox.upsertThread, {
      tenantId: tenantId as Id<'tenants'>,
      userId: userId as Id<'users'>,
      provider,
      externalThreadId: threadExternalId,
      subject: isWhatsApp ? `WhatsApp with ${phone}` : `SMS with ${phone}`,
      snippet: messageBody.slice(0, 200),
      lastMessageAt: now,
      participantEmails: phone ? [phone] : [],
      prospectId,
      needsReply: !isOutbound,
    })

    await convex.mutation(api.inbox.insertMessage, {
      threadId,
      externalMessageId,
      sentAt: now,
      fromEmail: isOutbound ? 'you' : phone,
      senderLabel: isOutbound ? undefined : phone,
      bodyPreview: messageBody,
      isOutbound,
    })

    return NextResponse.json({ ok: true, threadId })
  } catch (e) {
    console.error('[composio/inbox]', e)
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }
}
