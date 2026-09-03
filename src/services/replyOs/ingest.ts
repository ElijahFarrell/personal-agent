import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { INBOX_PROVIDER, REPLY_TAG, TRIAGE_STATUS } from '@convex/constants'
import { classifySellerReply } from './classify'
import { draftSellerReply } from './draft'
import { formatPropertyCard, resolvePropertyForThread } from './propertyCard'
import type { InboundReplyEvent } from './types'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function providerFromEvent(
  provider: InboundReplyEvent['provider']
): typeof INBOX_PROVIDER.SMS | typeof INBOX_PROVIDER.SMARTER_CONTACT {
  return provider === 'smarter_contact'
    ? INBOX_PROVIDER.SMARTER_CONTACT
    : INBOX_PROVIDER.SMS
}

function laterFollowUpNote(timeline?: string): string {
  return timeline
    ? `Follow-up suggestion: check back ${timeline}.`
    : 'Follow-up suggestion: seller is not ready; check back later.'
}

export async function processThreadReply(args: {
  tenantId: Id<'tenants'>
  threadId: Id<'inboxThreads'>
  force?: boolean
}): Promise<{ triageId: Id<'replyTriage'> } | null> {
  const thread = await convex.query(api.inbox.getThread, {
    threadId: args.threadId,
  })
  if (!thread || thread.tenantId !== args.tenantId) return null

  const messages = await convex.query(api.inbox.listMessagesForThread, {
    threadId: args.threadId,
    limit: 200,
  })
  const inbound = [...messages].reverse().find((m) => !m.isOutbound)
  if (!inbound) return null

  const existingTriage = await convex.query(api.replyTriage.getByThread, {
    threadId: args.threadId,
  })
  if (
    !args.force &&
    existingTriage?.lastInboundMessageId === inbound.externalMessageId
  ) {
    return { triageId: existingTriage._id }
  }

  const transcript = messages
    .map((m) => `${m.isOutbound ? 'OUT' : 'IN'}: ${m.bodyPreview}`)
    .join('\n')

  let property = existingTriage?.propertyId
    ? await convex.query(api.properties.getById, {
        propertyId: existingTriage.propertyId,
      })
    : null
  if (!property) {
    property = await resolvePropertyForThread({
      tenantId: args.tenantId,
      thread,
      extracted: {},
    })
  }

  const classification = await classifySellerReply({
    transcript,
    propertyCard: formatPropertyCard(property),
    kind: property.kind,
  })

  const extracted =
    classification.tag === REPLY_TAG.LATER
      ? {
          ...classification.extracted,
          notes: laterFollowUpNote(classification.extracted.timeline),
        }
      : classification.extracted

  const status =
    classification.tag === REPLY_TAG.IGNORE
      ? TRIAGE_STATUS.HANDLED
      : TRIAGE_STATUS.OPEN

  const triageId = await convex.mutation(api.replyTriage.upsertForThread, {
    tenantId: args.tenantId,
    threadId: args.threadId,
    prospectId: property.prospectId ?? thread.prospectId,
    propertyId: property._id,
    tag: classification.tag,
    confidence: classification.confidence,
    reason: classification.reason,
    extracted,
    status,
    lastInboundMessageId: inbound.externalMessageId,
    model: classification.model,
  })

  if (
    classification.tag === REPLY_TAG.HUMAN_NOW ||
    classification.tag === REPLY_TAG.DEAL
  ) {
    const owner = await convex.query(api.users.getUserById, {
      userId: thread.userId,
    })
    if (owner) {
      const triage = await convex.query(api.replyTriage.getById, { triageId })
      if (triage) {
        await draftSellerReply({
          tenantId: args.tenantId,
          userId: owner.clerkUserId,
          thread,
          triage,
          property,
        })
      }
    }
  }

  return { triageId }
}

export async function ingestInboundReply(
  event: InboundReplyEvent
): Promise<{ threadId: Id<'inboxThreads'>; triageId: Id<'replyTriage'> | null }> {
  const provider = providerFromEvent(event.provider)
  const threadId = await convex.mutation(api.inbox.upsertThread, {
    tenantId: event.tenantId,
    userId: event.userId,
    provider,
    externalThreadId: event.externalThreadId,
    subject: `${provider === INBOX_PROVIDER.SMARTER_CONTACT ? 'Smarter Contact' : 'SMS'} with ${event.fromPhone}`,
    snippet: event.body.slice(0, 200),
    lastMessageAt: event.receivedAt,
    participantEmails: [event.fromPhone],
    needsReply: true,
  })

  await convex.mutation(api.inbox.insertMessage, {
    threadId,
    externalMessageId: event.externalMessageId,
    sentAt: event.receivedAt,
    fromEmail: event.fromPhone,
    senderLabel: event.fromPhone,
    bodyPreview: event.body,
    isOutbound: false,
  })

  const processed = await processThreadReply({
    tenantId: event.tenantId,
    threadId,
  })

  return { threadId, triageId: processed?.triageId ?? null }
}
