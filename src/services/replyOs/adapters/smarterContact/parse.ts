import type { Id } from '@convex/_generated/dataModel'
import type { InboundReplyEvent } from '../../types'

export interface SmarterContactMessage {
  id: string
  body: string
  sentAt: number
  isOutbound: boolean
}

export interface SmarterContactThread {
  externalThreadId: string
  phone: string
  snippet: string
  unread: boolean
  messages: SmarterContactMessage[]
}

export interface SmarterContactSnapshot {
  threads: SmarterContactThread[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseMessage(value: unknown): SmarterContactMessage | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' ? value.id : ''
  const body = typeof value.body === 'string' ? value.body : ''
  if (!id || !body) return null
  const sentAt = typeof value.sentAt === 'number' ? value.sentAt : 0
  const isOutbound = value.isOutbound === true
  return { id, body, sentAt, isOutbound }
}

function parseThread(value: unknown): SmarterContactThread | null {
  if (!isRecord(value)) return null
  const externalThreadId =
    typeof value.externalThreadId === 'string' ? value.externalThreadId : ''
  const phone = typeof value.phone === 'string' ? value.phone : ''
  if (!externalThreadId && !phone) return null
  const snippet = typeof value.snippet === 'string' ? value.snippet : ''
  const unread = value.unread === true
  const messagesRaw = Array.isArray(value.messages) ? value.messages : []
  const messages = messagesRaw
    .map(parseMessage)
    .filter((m): m is SmarterContactMessage => m !== null)
  return {
    externalThreadId: externalThreadId || phone,
    phone,
    snippet,
    unread,
    messages,
  }
}

export function parseSmarterContactSnapshot(
  snapshot: SmarterContactSnapshot,
  ctx: { tenantId: Id<'tenants'>; userId: Id<'users'> }
): InboundReplyEvent[] {
  const events: InboundReplyEvent[] = []
  for (const thread of snapshot.threads) {
    if (!thread.phone) continue
    for (const message of thread.messages) {
      if (message.isOutbound) continue
      events.push({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        provider: 'smarter_contact',
        externalThreadId: thread.externalThreadId || thread.phone,
        externalMessageId: message.id,
        fromPhone: thread.phone,
        body: message.body,
        receivedAt: message.sentAt || Date.now(),
      })
    }
  }
  return events
}

export function parseSmarterContactHtml(html: string): SmarterContactSnapshot {
  const trimmed = html.trim()
  if (!trimmed) return { threads: [] }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (isRecord(parsed) && Array.isArray(parsed.threads)) {
        return {
          threads: parsed.threads
            .map(parseThread)
            .filter((t): t is SmarterContactThread => t !== null),
        }
      }
    } catch {
      return { threads: [] }
    }
  }
  return { threads: [] }
}
