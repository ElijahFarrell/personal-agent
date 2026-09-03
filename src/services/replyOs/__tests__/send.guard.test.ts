import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Id } from '@convex/_generated/dataModel'
import { DRAFT_STATUS, INBOX_PROVIDER } from '@convex/constants'

const {
  query,
  mutation,
  sendInboxThreadReply,
  ensureLegalAcceptance,
  assertComplianceOrThrow,
} = vi.hoisted(() => ({
  query: vi.fn(),
  mutation: vi.fn(),
  sendInboxThreadReply: vi.fn(),
  ensureLegalAcceptance: vi.fn(),
  assertComplianceOrThrow: vi.fn(),
}))

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    query = query
    mutation = mutation
  },
}))

vi.mock('@/services/inboxReplyService', () => ({
  sendInboxThreadReply,
}))

vi.mock('@/services/compliance/legalGate', () => ({
  ensureLegalAcceptance,
}))

vi.mock('@/services/compliance/policyEngine', () => ({
  assertComplianceOrThrow,
}))

vi.mock('@/constants/complianceDisclosures', () => ({
  withMandatorySmsOptOut: (body: string) => `${body} Reply STOP to opt out.`,
}))

import { approveReplyDraft } from '../send'

describe('approveReplyDraft smarter_contact guard', () => {
  beforeEach(() => {
    query.mockReset()
    mutation.mockReset()
    sendInboxThreadReply.mockReset()
    ensureLegalAcceptance.mockReset()
    assertComplianceOrThrow.mockReset()
  })

  it('never calls send for smarter_contact threads', async () => {
    query
      .mockResolvedValueOnce({
        _id: 'replyDrafts:d1',
        tenantId: 'tenants:t1',
        threadId: 'inboxThreads:th1',
        body: 'Thanks — is the acreage still 5?',
      })
      .mockResolvedValueOnce({
        _id: 'inboxThreads:th1',
        tenantId: 'tenants:t1',
        provider: INBOX_PROVIDER.SMARTER_CONTACT,
        externalThreadId: '+15551212',
      })
      .mockResolvedValueOnce({
        _id: 'users:u1',
        tenantId: 'tenants:t1',
        email: 'op@example.com',
      })
      .mockResolvedValueOnce({
        _id: 'replyTriage:tr1',
        tenantId: 'tenants:t1',
      })
    mutation.mockResolvedValue({ status: DRAFT_STATUS.APPROVED })

    const result = await approveReplyDraft({
      tenantId: 'tenants:t1' as Id<'tenants'>,
      clerkUserId: 'user_abc',
      draftId: 'replyDrafts:d1' as Id<'replyDrafts'>,
    })

    expect(result).toEqual({
      copyOnly: true,
      body: 'Thanks — is the acreage still 5?',
    })
    expect(sendInboxThreadReply).not.toHaveBeenCalled()
    expect(ensureLegalAcceptance).not.toHaveBeenCalled()
    expect(assertComplianceOrThrow).not.toHaveBeenCalled()
    expect(mutation).toHaveBeenCalled()
  })
})
