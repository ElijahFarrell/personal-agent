/**
 * Full thread message bodies from Composio on demand (not stored in Convex).
 */
import { executeComposioTool } from '@/lib/composio'
import {
  looksLikeHtml,
  normalizeEmailPlainText,
  stripHtmlToText,
} from '@/lib/inboxEmailText'
import { INBOX_PROVIDER } from '@convex/constants'
import {
  deepExtractPlainFromPayload,
  extractGmailMessagesFromToolData,
  extractPlainTextFromGmailPayload,
} from '@/lib/gmailPayloadPlain'

export type LiveInboxMessage = {
  externalMessageId: string
  sentAt: number
  fromEmail: string
  isOutbound: boolean
  bodyPlain: string
}

function parseFrom(fromHeader: string): string {
  const m = fromHeader.match(/<([^>]+)>/)
  return m ? m[1].trim() : fromHeader.trim()
}

function extractOutlookAddress(addr: Record<string, unknown> | undefined): string {
  if (!addr) return ''
  const email = addr.emailAddress as { address?: string } | undefined
  return String(email?.address ?? '').toLowerCase().trim()
}

async function fetchGmailThreadMessagesLive(
  clerkUserId: string,
  externalThreadId: string
): Promise<LiveInboxMessage[]> {
  const result = await executeComposioTool<Record<string, unknown>>(clerkUserId, 'GMAIL_FETCH_MESSAGE_BY_THREAD_ID', {
    thread_id: externalThreadId,
    format: 'full',
  })

  if (!result.successful || !result.data) {
    if (result.error) throw new Error(result.error)
    return []
  }

  const raw = extractGmailMessagesFromToolData(result.data)
  const out: LiveInboxMessage[] = []

  for (const m of raw) {
    const msgId = String(m.id ?? m.messageId ?? '')
    if (!msgId) continue

    const headers = (m.payload as { headers?: Array<{ name?: string; value?: string }> })?.headers ?? []
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

    const date = getHeader('Date')
    const sentAt = date ? Date.parse(date) || Date.now() : Date.now()
    const labelIds = (m.labelIds as string[]) ?? []
    const isOutbound = labelIds.includes('SENT')
    const from = parseFrom(getHeader('From')).toLowerCase() || 'unknown'

    let plain = extractPlainTextFromGmailPayload(m.payload).trim()
    if (!plain) plain = deepExtractPlainFromPayload(m.payload).trim()
    if (!plain) plain = normalizeEmailPlainText(String(m.snippet ?? ''))
    if (!plain) plain = '(No content)'

    plain = normalizeEmailPlainText(plain) || plain

    out.push({
      externalMessageId: msgId,
      sentAt,
      fromEmail: from,
      isOutbound,
      bodyPlain: plain,
    })
  }

  out.sort((a, b) => a.sentAt - b.sentAt)
  return out
}

function collectOutlookMessages(
  res: { successful: boolean; data?: Record<string, unknown> },
  externalThreadId: string,
  userEmailLower: string,
  defaultOutbound: boolean
): LiveInboxMessage[] {
  const out: LiveInboxMessage[] = []
  if (!res.successful || !res.data) return out
  const data = res.data as Record<string, unknown>
  const inner = (data.data as Record<string, unknown>)?.response_data as Record<string, unknown> | undefined
  const nestedData = data.data as Record<string, unknown> | undefined
  const value =
    (inner?.value as unknown[]) ?? (nestedData?.value as unknown[]) ?? (data.value as unknown[]) ?? []

  for (const item of value) {
    const m = item as Record<string, unknown>
    const convId = String(m.conversationId ?? '')
    if (convId !== externalThreadId) continue

    const messageId = String(m.id ?? '')
    if (!messageId) continue

    const from = extractOutlookAddress(m.from as Record<string, unknown>)
    const rd = String(m.receivedDateTime ?? '')
    const sentAt = rd ? Date.parse(rd) || Date.now() : Date.now()
    const isDraft = m.isDraft === true
    if (isDraft) continue
    const isOutbound =
      defaultOutbound || (from !== '' && from === userEmailLower)

    const rawBody = String(m.bodyPreview ?? '')
    const bodyPlain = normalizeEmailPlainText(rawBody) || rawBody.trim() || '(No content)'

    out.push({
      externalMessageId: messageId,
      sentAt,
      fromEmail: from || 'unknown',
      isOutbound,
      bodyPlain,
    })
  }
  return out
}

/** Unwrap Composio `OUTLOOK_GET_MESSAGE` payload (single message). */
function extractOutlookSingleMessageFromToolData(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const nested = d.data as Record<string, unknown> | undefined
  const rd = nested?.response_data as Record<string, unknown> | undefined
  if (rd && typeof rd === 'object' && (rd.id || rd.body)) return rd
  if (nested && (nested.id || nested.body)) return nested
  if (d.id || d.body) return d
  return null
}

async function fetchOutlookMessageBodyFull(
  clerkUserId: string,
  messageId: string
): Promise<string> {
  const result = await executeComposioTool<Record<string, unknown>>(clerkUserId, 'OUTLOOK_GET_MESSAGE', {
    user_id: 'me',
    message_id: messageId,
    select: ['body', 'bodyPreview'],
  })
  if (!result.successful || !result.data) return ''
  const m = extractOutlookSingleMessageFromToolData(result.data)
  if (!m) return ''
  const body = m.body as { content?: string; contentType?: string } | undefined
  const raw = String(body?.content ?? '')
  const preview = String(m.bodyPreview ?? '').trim()
  if (!raw.trim()) return normalizeEmailPlainText(preview) || preview
  const ct = String(body?.contentType ?? '').toLowerCase()
  if (ct.includes('html') || looksLikeHtml(raw)) {
    const plain = stripHtmlToText(raw)
    return normalizeEmailPlainText(plain) || plain.trim() || preview
  }
  return normalizeEmailPlainText(raw) || raw.trim() || preview
}

async function fetchOutlookThreadMessagesLive(
  clerkUserId: string,
  externalThreadId: string,
  userEmailLower: string
): Promise<LiveInboxMessage[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [inboxRes, sentRes] = await Promise.all([
    executeComposioTool<Record<string, unknown>>(clerkUserId, 'OUTLOOK_LIST_MESSAGES', {
      folder: 'inbox',
      top: 100,
      user_id: 'me',
      received_date_time_gt: since,
      select: [
        'id',
        'subject',
        'from',
        'toRecipients',
        'bodyPreview',
        'receivedDateTime',
        'conversationId',
        'isDraft',
      ],
    }),
    executeComposioTool<Record<string, unknown>>(clerkUserId, 'OUTLOOK_LIST_MESSAGES', {
      folder: 'sentitems',
      top: 100,
      user_id: 'me',
      sent_date_time_gt: since,
      select: [
        'id',
        'subject',
        'from',
        'toRecipients',
        'bodyPreview',
        'receivedDateTime',
        'conversationId',
        'isDraft',
      ],
    }),
  ])

  const combined = [
    ...collectOutlookMessages(inboxRes, externalThreadId, userEmailLower, false),
    ...collectOutlookMessages(sentRes, externalThreadId, userEmailLower, true),
  ]

  const byId = new Map<string, LiveInboxMessage>()
  for (const m of combined) {
    byId.set(m.externalMessageId, m)
  }
  const merged = [...byId.values()]
  merged.sort((a, b) => a.sentAt - b.sentAt)

  const withBodies = await Promise.all(
    merged.map(async (m) => {
      const full = await fetchOutlookMessageBodyFull(clerkUserId, m.externalMessageId)
      const bodyPlain = full.trim() || m.bodyPlain
      return { ...m, bodyPlain: bodyPlain || '(No content)' }
    })
  )
  return withBodies
}

export async function fetchLiveThreadMessages(
  clerkUserId: string,
  provider: typeof INBOX_PROVIDER.GMAIL | typeof INBOX_PROVIDER.OUTLOOK | typeof INBOX_PROVIDER.WHATSAPP,
  externalThreadId: string,
  userEmailLower: string
): Promise<LiveInboxMessage[]> {
  if (provider === INBOX_PROVIDER.WHATSAPP) {
    return []
  }
  if (provider === INBOX_PROVIDER.GMAIL) {
    return fetchGmailThreadMessagesLive(clerkUserId, externalThreadId)
  }
  return fetchOutlookThreadMessagesLive(clerkUserId, externalThreadId, userEmailLower)
}
