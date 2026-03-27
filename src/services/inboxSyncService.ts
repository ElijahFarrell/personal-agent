/**
 * Unified inbox sync: Gmail + Outlook (Composio) → Convex.
 * WhatsApp has no list API in Composio; use webhooks (see /api/webhooks/composio/inbox).
 */
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { executeComposioTool, getComposioConnectionStatus } from '@/lib/composio'
import { INBOX_PROVIDER } from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function parseFrom(fromHeader: string): string {
  const m = fromHeader.match(/<([^>]+)>/)
  return m ? m[1].trim() : fromHeader.trim()
}

interface ParsedMsg {
  threadId: string
  messageId: string
  subject: string
  snippet: string
  from: string
  participants: string[]
  sentAt: number
  isOutbound: boolean
  labelIds: string[]
}

export async function syncGmailInboxForUser(params: {
  clerkUserId: string
  dbUserId: Id<'users'>
  tenantId: Id<'tenants'>
}): Promise<{ threadsSynced: number }> {
  const status = await getComposioConnectionStatus(params.clerkUserId)
  if (!status.gmail) {
    return { threadsSynced: 0 }
  }

  const result = await executeComposioTool<{ messages?: Array<Record<string, unknown>> }>(
    params.clerkUserId,
    'GMAIL_FETCH_EMAILS',
    {
      query: 'in:inbox newer_than:30d',
      max_results: 40,
      include_payload: true,
    }
  )

  if (!result.successful) {
    if (result.error) throw new Error(result.error)
    return { threadsSynced: 0 }
  }

  const raw = result.data?.messages ?? []
  const parsed: ParsedMsg[] = []

  for (const m of raw) {
    const threadId = String(m.threadId ?? m.thread_id ?? '')
    const msgId = String(m.id ?? '')
    if (!threadId || !msgId) continue

    const headers = (m.payload as { headers?: Array<{ name?: string; value?: string }> })?.headers ?? []
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

    const subject = getHeader('Subject')
    const from = parseFrom(getHeader('From'))
    const toRaw = getHeader('To')
    const date = getHeader('Date')
    const sentAt = date ? Date.parse(date) || Date.now() : Date.now()
    const labelIds = (m.labelIds as string[]) ?? []
    const participants = new Set<string>()
    if (from) participants.add(from.toLowerCase())
    for (const addr of toRaw.split(',')) {
      const p = parseFrom(addr).toLowerCase()
      if (p) participants.add(p)
    }

    const fromLower = from.toLowerCase()
    const isOutbound = labelIds.includes('SENT')

    parsed.push({
      threadId,
      messageId: msgId,
      subject: subject || '(no subject)',
      snippet: String(m.snippet ?? ''),
      from: fromLower,
      participants: [...participants],
      sentAt,
      isOutbound,
      labelIds,
    })
  }

  return persistParsedThreads(
    { dbUserId: params.dbUserId, tenantId: params.tenantId },
    parsed,
    INBOX_PROVIDER.GMAIL
  )
}

interface OutlookMsg {
  threadId: string
  messageId: string
  subject: string
  snippet: string
  from: string
  participants: string[]
  sentAt: number
  isOutbound: boolean
}

function extractOutlookAddress(
  addr: Record<string, unknown> | undefined
): string {
  if (!addr) return ''
  const email = addr.emailAddress as { address?: string } | undefined
  return String(email?.address ?? '').toLowerCase().trim()
}

export async function syncOutlookInboxForUser(params: {
  clerkUserId: string
  dbUserId: Id<'users'>
  tenantId: Id<'tenants'>
  userEmailLower: string
}): Promise<{ threadsSynced: number }> {
  try {
  const status = await getComposioConnectionStatus(params.clerkUserId)
  if (!status.outlook) {
    return { threadsSynced: 0 }
  }

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const inboxRes = await executeComposioTool<Record<string, unknown>>(
    params.clerkUserId,
    'OUTLOOK_LIST_MESSAGES',
    {
      folder: 'inbox',
      top: 40,
      user_id: 'me',
      received_date_time_gt: since,
      select: ['id', 'subject', 'from', 'toRecipients', 'bodyPreview', 'receivedDateTime', 'conversationId', 'isDraft'],
    }
  )

  const sentRes = await executeComposioTool<Record<string, unknown>>(
    params.clerkUserId,
    'OUTLOOK_LIST_MESSAGES',
    {
      folder: 'sentitems',
      top: 25,
      user_id: 'me',
      sent_date_time_gt: since,
      select: ['id', 'subject', 'from', 'toRecipients', 'bodyPreview', 'receivedDateTime', 'conversationId', 'isDraft'],
    }
  )

  const messages: OutlookMsg[] = []

  const collect = (res: typeof inboxRes, defaultOutbound: boolean) => {
    if (!res.successful || !res.data) return
    const data = res.data as Record<string, unknown>
    const inner = (data.data as Record<string, unknown>)?.response_data as Record<string, unknown> | undefined
    const value = (inner?.value as unknown[]) ?? (data.value as unknown[]) ?? []
    for (const item of value) {
      const m = item as Record<string, unknown>
      const messageId = String(m.id ?? '')
      const convId = String(m.conversationId ?? m.id ?? '')
      if (!messageId) continue
      const from = extractOutlookAddress(m.from as Record<string, unknown>)
      const toList = (m.toRecipients as Array<Record<string, unknown>>) ?? []
      const participants = new Set<string>()
      if (from) participants.add(from)
      for (const t of toList) {
        const a = extractOutlookAddress(t)
        if (a) participants.add(a)
      }
      const rd = String(m.receivedDateTime ?? '')
      const sentAt = rd ? Date.parse(rd) || Date.now() : Date.now()
      const isDraft = m.isDraft === true
      if (isDraft) continue
      const isOutbound =
        defaultOutbound || (from !== '' && from === params.userEmailLower)
      messages.push({
        threadId: convId || messageId,
        messageId,
        subject: String(m.subject ?? '(no subject)'),
        snippet: String(m.bodyPreview ?? ''),
        from: from || 'unknown',
        participants: [...participants],
        sentAt,
        isOutbound,
      })
    }
  }

  collect(inboxRes, false)
  collect(sentRes, true)

  const parsed: ParsedMsg[] = messages.map((m) => ({
    threadId: m.threadId,
    messageId: m.messageId,
    subject: m.subject,
    snippet: m.snippet,
    from: m.from,
    participants: m.participants,
    sentAt: m.sentAt,
    isOutbound: m.isOutbound,
    labelIds: [],
  }))

  return persistParsedThreads(
    { dbUserId: params.dbUserId, tenantId: params.tenantId },
    parsed,
    INBOX_PROVIDER.OUTLOOK
  )
  } catch (e) {
    console.warn('[inbox] Outlook sync failed:', e)
    return { threadsSynced: 0 }
  }
}

async function persistParsedThreads(
  params: {
    dbUserId: Id<'users'>
    tenantId: Id<'tenants'>
  },
  parsed: ParsedMsg[],
  provider: typeof INBOX_PROVIDER.GMAIL | typeof INBOX_PROVIDER.OUTLOOK
): Promise<{ threadsSynced: number }> {
  const prospects = await convex.query(api.prospects.getProspectsByTenantId, {
    tenantId: params.tenantId,
  })

  const emailToProspect = new Map<string, Id<'prospects'>>()
  for (const p of prospects ?? []) {
    const em = p.email?.toLowerCase().trim()
    if (em) emailToProspect.set(em, p._id)
  }

  const byThread = new Map<string, ParsedMsg[]>()
  for (const p of parsed) {
    const arr = byThread.get(p.threadId) ?? []
    arr.push(p)
    byThread.set(p.threadId, arr)
  }

  let threadsSynced = 0
  for (const [, msgs] of byThread) {
    const sorted = [...msgs].sort((a, b) => b.sentAt - a.sentAt)
    const latest = sorted[0]
    const allParticipants = new Set<string>()
    for (const m of msgs) {
      m.participants.forEach((e) => allParticipants.add(e))
      if (m.from) allParticipants.add(m.from)
    }

    const prospectId =
      emailToProspect.get(latest.from) ??
      [...allParticipants].map((e) => emailToProspect.get(e)).find(Boolean)

    const needsReply =
      !latest.isOutbound && !latest.labelIds.includes('DRAFT')

    const threadConvexId = await convex.mutation(api.inbox.upsertThread, {
      tenantId: params.tenantId,
      userId: params.dbUserId,
      provider,
      externalThreadId: latest.threadId,
      subject: latest.subject,
      snippet: latest.snippet,
      lastMessageAt: latest.sentAt,
      participantEmails: [...allParticipants],
      prospectId,
      needsReply,
    })

    for (const m of msgs) {
      await convex.mutation(api.inbox.insertMessage, {
        threadId: threadConvexId,
        externalMessageId: m.messageId,
        sentAt: m.sentAt,
        fromEmail: m.from || 'unknown',
        senderId: m.from || undefined,
        bodyPreview: m.snippet.slice(0, 500),
        isOutbound: m.isOutbound,
      })
    }
    threadsSynced++
  }

  return { threadsSynced }
}

export interface UnifiedInboxSyncResult {
  gmail: { threadsSynced: number }
  outlook: { threadsSynced: number }
  whatsapp: { threadsSynced: number; note?: string }
}

/**
 * Pull-based sync for providers that support listing messages.
 */
export async function syncUnifiedInboxForUser(params: {
  clerkUserId: string
  dbUserId: Id<'users'>
  tenantId: Id<'tenants'>
  userEmailLower: string
}): Promise<UnifiedInboxSyncResult> {
  const [gmail, outlook] = await Promise.all([
    syncGmailInboxForUser({
      clerkUserId: params.clerkUserId,
      dbUserId: params.dbUserId,
      tenantId: params.tenantId,
    }),
    syncOutlookInboxForUser(params),
  ])

  return {
    gmail,
    outlook,
    whatsapp: {
      threadsSynced: 0,
      note:
        'WhatsApp inbound sync uses Composio triggers → POST /api/webhooks/composio/inbox (no pull API).',
    },
  }
}
