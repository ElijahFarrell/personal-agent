import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  COMPLIANCE_CHANNEL,
  DRAFT_STATUS,
  INBOX_PROVIDER,
  TRIAGE_STATUS,
} from '@convex/constants'
import { withMandatorySmsOptOut } from '@/constants/complianceDisclosures'
import { ensureLegalAcceptance } from '@/services/compliance/legalGate'
import { assertComplianceOrThrow } from '@/services/compliance/policyEngine'
import { sendInboxThreadReply } from '@/services/inboxReplyService'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export interface ApproveReplyResult {
  copyOnly: boolean
  body: string
}

export async function approveReplyDraft(args: {
  tenantId: Id<'tenants'>
  clerkUserId: string
  draftId: Id<'replyDrafts'>
  editedBody?: string
}): Promise<ApproveReplyResult> {
  const draft = await convex.query(api.replyDrafts.getById, {
    draftId: args.draftId,
  })
  if (!draft || draft.tenantId !== args.tenantId) {
    throw new Error('Draft not found')
  }

  const thread = await convex.query(api.inbox.getThread, {
    threadId: draft.threadId,
  })
  if (!thread || thread.tenantId !== args.tenantId) {
    throw new Error('Thread not found')
  }

  if (args.editedBody !== undefined) {
    await convex.mutation(api.replyDrafts.updateBody, {
      draftId: args.draftId,
      body: args.editedBody,
    })
  }

  const body = (args.editedBody ?? draft.editedBody ?? draft.body).trim()
  if (!body) throw new Error('Reply body is empty')

  const dbUser = await convex.query(api.users.getUserByClerkUserId, {
    clerkUserId: args.clerkUserId,
  })
  if (!dbUser || dbUser.tenantId !== args.tenantId) {
    throw new Error('User not found')
  }

  const markHandled = async () => {
    const triage = await convex.query(api.replyTriage.getByThread, {
      threadId: draft.threadId,
    })
    if (triage && triage.tenantId === args.tenantId) {
      await convex.mutation(api.replyTriage.setStatus, {
        triageId: triage._id,
        status: TRIAGE_STATUS.HANDLED,
      })
    }
  }

  if (thread.provider === INBOX_PROVIDER.SMARTER_CONTACT) {
    await convex.mutation(api.replyDrafts.setStatus, {
      draftId: args.draftId,
      status: DRAFT_STATUS.APPROVED,
    })
    await markHandled()
    return { copyOnly: true, body }
  }

  try {
    await ensureLegalAcceptance({
      tenantId: args.tenantId,
      userId: dbUser._id,
    })
    await assertComplianceOrThrow({
      tenantId: args.tenantId,
      userId: dbUser._id,
      channel: COMPLIANCE_CHANNEL.SMS,
      phone: thread.externalThreadId,
      payload: { threadId: thread._id, body },
    })
    const outboundBody = withMandatorySmsOptOut(body)
    await sendInboxThreadReply({
      clerkUserId: args.clerkUserId,
      userEmailLower: dbUser.email.toLowerCase().trim(),
      thread: {
        provider: INBOX_PROVIDER.SMS,
        externalThreadId: thread.externalThreadId,
      },
      body: outboundBody,
    })
    await convex.mutation(api.replyDrafts.setStatus, {
      draftId: args.draftId,
      status: DRAFT_STATUS.SENT,
      sentAt: Date.now(),
    })
    await markHandled()
    return { copyOnly: false, body: outboundBody }
  } catch (error) {
    const sendError = error instanceof Error ? error.message : 'Send failed'
    await convex.mutation(api.replyDrafts.setStatus, {
      draftId: args.draftId,
      status: DRAFT_STATUS.FAILED,
      sendError,
    })
    throw error
  }
}
