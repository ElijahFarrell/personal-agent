import { describe, expect, it } from 'vitest'
import type { Id } from '@convex/_generated/dataModel'
import {
  parseSmarterContactHtml,
  parseSmarterContactSnapshot,
  type SmarterContactSnapshot,
} from '../adapters/smarterContact/parse'

const ctx = {
  tenantId: 'tenants:t1' as Id<'tenants'>,
  userId: 'users:u1' as Id<'users'>,
}

describe('parseSmarterContactSnapshot', () => {
  it('emits inbound messages and drops outbound', () => {
    const snapshot: SmarterContactSnapshot = {
      threads: [
        {
          externalThreadId: 'sc-1',
          phone: '+15551212',
          snippet: 'yes',
          unread: true,
          messages: [
            { id: 'm1', body: 'Are you selling?', sentAt: 1, isOutbound: true },
            { id: 'm2', body: 'yes', sentAt: 2, isOutbound: false },
            { id: 'm3', body: 'Great', sentAt: 3, isOutbound: true },
          ],
        },
        {
          externalThreadId: 'sc-2',
          phone: '',
          snippet: 'hi',
          unread: true,
          messages: [{ id: 'm4', body: 'hi', sentAt: 4, isOutbound: false }],
        },
      ],
    }

    const events = parseSmarterContactSnapshot(snapshot, ctx)
    expect(events).toHaveLength(1)
    expect(events[0]?.externalMessageId).toBe('m2')
    expect(events[0]?.provider).toBe('smarter_contact')
    expect(events[0]?.fromPhone).toBe('+15551212')
  })
})

describe('parseSmarterContactHtml', () => {
  it('parses a JSON snapshot string', () => {
    const html = JSON.stringify({
      threads: [
        {
          externalThreadId: 'sc-9',
          phone: '+15550000',
          snippet: 'ok',
          unread: true,
          messages: [{ id: 'x', body: 'ok', sentAt: 9, isOutbound: false }],
        },
      ],
    })
    const snapshot = parseSmarterContactHtml(html)
    expect(snapshot.threads).toHaveLength(1)
    expect(snapshot.threads[0]?.phone).toBe('+15550000')
  })
})
