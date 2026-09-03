import { describe, expect, it } from 'vitest'
import { REPLY_TAG, TRIAGE_STATUS } from '@convex/constants'
import type { Doc } from '@convex/_generated/dataModel'
import { buildTravelDigest, type TravelQueueItem } from '../queue'

function item(n: number): TravelQueueItem {
  return {
    triage: {
      _id: `replyTriage:${n}`,
      _creationTime: n,
      tenantId: 'tenants:t',
      threadId: 'inboxThreads:th',
      tag: REPLY_TAG.HUMAN_NOW,
      confidence: 0.9,
      reason: `reason ${n}`,
      extracted: {},
      status: TRIAGE_STATUS.OPEN,
      lastInboundMessageId: `m${n}`,
      classifiedAt: n,
      model: 'rules',
      updatedAt: n,
    } as unknown as Doc<'replyTriage'>,
    draft: {
      body: `draft ${n}`,
    } as unknown as Doc<'replyDrafts'>,
    propertyCard: `Kind: land`,
    threadSnippet: `snippet ${n}`,
  }
}

describe('buildTravelDigest', () => {
  it('caps the digest at 3 items', () => {
    const digest = buildTravelDigest([item(1), item(2), item(3), item(4), item(5)])
    expect(digest).toContain('draft 1')
    expect(digest).toContain('draft 3')
    expect(digest).not.toContain('draft 4')
    expect(digest.split('\n\n')).toHaveLength(3)
  })

  it('handles an empty queue', () => {
    expect(buildTravelDigest([])).toBe('No seller replies need you right now.')
  })
})
