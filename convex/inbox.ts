import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, INBOX_PROVIDER, TABLES } from './constants'

export const listThreadsForUser = query({
  args: {
    userId: v.id(TABLES.USERS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 50 }) => {
    const rows = await ctx.db
      .query(TABLES.INBOX_THREADS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .collect()
    rows.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    return rows.slice(0, limit)
  },
})

export const upsertThread = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    provider: v.union(
      v.literal(INBOX_PROVIDER.GMAIL),
      v.literal(INBOX_PROVIDER.OUTLOOK)
    ),
    externalThreadId: v.string(),
    subject: v.optional(v.string()),
    snippet: v.optional(v.string()),
    lastMessageAt: v.number(),
    participantEmails: v.array(v.string()),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    needsReply: v.boolean(),
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
    if (dup) return dup._id

    return await ctx.db.insert(TABLES.INBOX_MESSAGES, {
      threadId: args.threadId,
      externalMessageId: args.externalMessageId,
      sentAt: args.sentAt,
      fromEmail: args.fromEmail,
      bodyPreview: args.bodyPreview,
      isOutbound: args.isOutbound,
      createdAt: Date.now(),
    })
  },
})
