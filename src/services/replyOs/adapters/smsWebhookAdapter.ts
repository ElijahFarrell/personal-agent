import type { Id } from '@convex/_generated/dataModel'
import type { InboundReplyEvent } from '../types'

export function toInboundReplyEvent(
  raw: Record<string, unknown>,
  ctx: { tenantId: Id<'tenants'>; userId: Id<'users'> }
): InboundReplyEvent | null {
  const direction = String(raw.direction ?? '').toLowerCase()
  if (direction === 'outbound') return null

  const fromPhone = String(raw.from ?? raw.phone ?? '').trim()
  if (!fromPhone) return null

  const body = String(raw.body ?? '')
  const externalMessageId =
    typeof raw.externalMessageId === 'string' && raw.externalMessageId
      ? raw.externalMessageId
      : `sms_${String(raw.receivedAt ?? 'missing')}_${fromPhone}`
  const toPhone = typeof raw.to === 'string' && raw.to ? raw.to : undefined
  const receivedAt =
    typeof raw.receivedAt === 'number' ? raw.receivedAt : Date.now()

  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    provider: 'sms',
    externalThreadId: fromPhone,
    externalMessageId,
    fromPhone,
    toPhone,
    body,
    receivedAt,
    raw,
  }
}
