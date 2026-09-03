import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, INBOX_PROVIDER, TABLES } from './constants'

const inboxProviderValidator = v.union(
  v.literal(INBOX_PROVIDER.GMAIL),
  v.literal(INBOX_PROVIDER.OUTLOOK),
  v.literal(INBOX_PROVIDER.LINKEDIN),
  v.literal(INBOX_PROVIDER.WHATSAPP),
  v.literal(INBOX_PROVIDER.SMS),
  v.literal(INBOX_PROVIDER.SMARTER_CONTACT)
)

export const listThreadsForUser = query({
  args: {
    userId: v.id(TABLES.USERS),
    limit: v.optional(v.number()),
    sortOrder: v.optional(
      v.union(v.literal('recent'), v.literal('lead_score'), v.literal('needs_reply_first'))
    ),
  },
  handler: async (ctx, { userId, limit = 50, sortOrder = 'recent' }) => {
    const rows = await ctx.db
      .query(TABLES.INBOX_THREADS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .collect()

    if (sortOrder === 'recent') {
      rows.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      return rows.slice(0, limit)
    }

    const prospectIds = [
      ...new Set(rows.map((r) => r.prospectId).filter(Boolean)),
    ] as NonNullable<(typeof rows)[0]['prospectId']>[]

    const scoreByProspect = new Map<string, number>()
    for (const pid of prospectIds) {
      const p = await ctx.db.get(pid)
      if (p?.leadScore !== undefined) {
        scoreByProspect.set(String(pid), p.leadScore)
      }
    }

    if (sortOrder === 'lead_score') {
      rows.sort((a, b) => {
        const sa = a.prospectId ? scoreByProspect.get(String(a.prospectId)) ?? -1 : -1
        const sb = b.prospectId ? scoreByProspect.get(String(b.prospectId)) ?? -1 : -1
        if (sb !== sa) return sb - sa
        return b.lastMessageAt - a.lastMessageAt
      })
      return rows.slice(0, limit)
    }

    // needs_reply_first
    rows.sort((a, b) => {
      if (a.needsReply !== b.needsReply) return a.needsReply ? -1 : 1
      const sa = a.prospectId ? scoreByProspect.get(String(a.prospectId)) ?? -1 : -1
      const sb = b.prospectId ? scoreByProspect.get(String(b.prospectId)) ?? -1 : -1
      if (sb !== sa) return sb - sa
      return b.lastMessageAt - a.lastMessageAt
    })
    return rows.slice(0, limit)
  },
})

export const getThread = query({
  args: { threadId: v.id(TABLES.INBOX_THREADS) },
  handler: async (ctx, { threadId }) => {
    return await ctx.db.get(threadId)
  },
})

export const listMessagesForThread = query({
  args: {
    threadId: v.id(TABLES.INBOX_THREADS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { threadId, limit = 200 }) => {
    const rows = await ctx.db
      .query(TABLES.INBOX_MESSAGES)
      .withIndex(INDEXES.BY_INBOX_THREAD_SENT_AT, (q) => q.eq('threadId', threadId))
      .order('asc')
      .take(limit)
    return rows
  },
})

export const upsertThread = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    provider: inboxProviderValidator,
    externalThreadId: v.string(),
    subject: v.optional(v.string()),
    snippet: v.optional(v.string()),
    lastMessageAt: v.number(),
    participantEmails: v.array(v.string()),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    needsReply: v.boolean(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query(TABLES.INBOX_THREADS)
      .withIndex(INDEXES.BY_USER_PROVIDER_EXTERNAL_THREAD, (q) =>
        q
          .eq('userId', args.userId)
          .eq('provider', args.provider)
          .eq('externalThreadId', args.externalThreadId)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        subject: args.subject,
        snippet: args.snippet,
        lastMessageAt: args.lastMessageAt,
        participantEmails: args.participantEmails,
        prospectId: args.prospectId,
        needsReply: args.needsReply,
        metadata: args.metadata !== undefined ? args.metadata : existing.metadata,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert(TABLES.INBOX_THREADS, {
      tenantId: args.tenantId,
      userId: args.userId,
      provider: args.provider,
      externalThreadId: args.externalThreadId,
      subject: args.subject,
      snippet: args.snippet,
      lastMessageAt: args.lastMessageAt,
      participantEmails: args.participantEmails,
      prospectId: args.prospectId,
      needsReply: args.needsReply,
      metadata: args.metadata,
      updatedAt: now,
    })
  },
})

export const insertMessage = mutation({
  args: {
    threadId: v.id(TABLES.INBOX_THREADS),
    externalMessageId: v.string(),
    sentAt: v.number(),
    fromEmail: v.string(),
    senderId: v.optional(v.string()),
    senderLabel: v.optional(v.string()),
    bodyPreview: v.string(),
    isOutbound: v.boolean(),
  },
  handler: async (ctx, args) => {
    const dup = await ctx.db
      .query(TABLES.INBOX_MESSAGES)
      .withIndex(INDEXES.BY_INBOX_THREAD_MESSAGE, (q) =>
        q.eq('threadId', args.threadId).eq('externalMessageId', args.externalMessageId)
      )
      .first()
    if (dup) {
      if (args.bodyPreview.length > (dup.bodyPreview?.length ?? 0)) {
        await ctx.db.patch(dup._id, { bodyPreview: args.bodyPreview })
      }
      return dup._id
    }

    return await ctx.db.insert(TABLES.INBOX_MESSAGES, {
      threadId: args.threadId,
      externalMessageId: args.externalMessageId,
      sentAt: args.sentAt,
      fromEmail: args.fromEmail,
      senderId: args.senderId,
      senderLabel: args.senderLabel,
      bodyPreview: args.bodyPreview,
      isOutbound: args.isOutbound,
      createdAt: Date.now(),
    })
  },
})
