/**
 * Sync Gmail (Composio) into Convex inbox tables for unified inbox UI.
 */
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { executeComposioTool } from '@/lib/composio'
import { getComposioConnectionStatus } from '@/lib/composio'
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
    throw new Error('Gmail is not connected')
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

    parsed.push({
      threadId,
      messageId: msgId,
      subject: subject || '(no subject)',
      snippet: String(m.snippet ?? ''),
      from: from.toLowerCase(),
      participants: [...participants],
      sentAt,
      isOutbound: labelIds.includes('SENT'),
      labelIds,
    })
  }

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
      provider: INBOX_PROVIDER.GMAIL,
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
        fromEmail: m.from,
        bodyPreview: m.snippet.slice(0, 500),
        isOutbound: m.isOutbound,
      })
    }
    threadsSynced++
  }

  return { threadsSynced }
}
