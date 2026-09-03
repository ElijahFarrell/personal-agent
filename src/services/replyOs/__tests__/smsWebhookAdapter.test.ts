import { describe, expect, it } from 'vitest'
import type { Id } from '@convex/_generated/dataModel'
import { toInboundReplyEvent } from '../adapters/smsWebhookAdapter'

const ctx = {
  tenantId: 'tenants:t1' as Id<'tenants'>,
  userId: 'users:u1' as Id<'users'>,
}

describe('toInboundReplyEvent', () => {
  it('normalizes an inbound Twilio-shaped payload', () => {
    const event = toInboundReplyEvent(
      {
        direction: 'inbound',
        from: '+15551212',
        to: '+15559999',
        body: 'yes',
        externalMessageId: 'SM123',
        receivedAt: 42,
      },
      ctx
    )
    expect(event).toEqual({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      provider: 'sms',
      externalThreadId: '+15551212',
      externalMessageId: 'SM123',
      fromPhone: '+15551212',
      toPhone: '+15559999',
      body: 'yes',
      receivedAt: 42,
      raw: expect.any(Object),
    })
  })

  it('returns null for outbound', () => {
    expect(
      toInboundReplyEvent(
        { direction: 'outbound', from: '+15551212', body: 'hi' },
        ctx
      )
    ).toBeNull()
  })

  it('returns null when phone is missing', () => {
    expect(
      toInboundReplyEvent({ direction: 'inbound', body: 'hi' }, ctx)
    ).toBeNull()
  })
})
