import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, MESSAGE_ROLE, MESSAGE_SOURCE, TABLES } from './constants'

// ─── Mutations ────────────────────────────────────────────────────────────────

export const saveMessage = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    tenantId: v.id(TABLES.TENANTS),
    role: v.union(v.literal(MESSAGE_ROLE.USER), v.literal(MESSAGE_ROLE.ASSISTANT)),
    source: v.union(v.literal(MESSAGE_SOURCE.WEB), v.literal(MESSAGE_SOURCE.TELEGRAM)),
    content: v.string(),
    threadId: v.string(),
    metadata: v.optional(
      v.object({
        route: v.optional(v.string()),
        toolCalls: v.optional(
          v.array(
            v.object({
              toolName: v.string(),
              state: v.string(),
              args: v.optional(v.any()),
              result: v.optional(v.any()),
            })
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert(TABLES.MESSAGES, {
      ...args,
      createdAt: Date.now(),
    })
  },
})

export const deleteMessage = mutation({
  args: { messageId: v.id(TABLES.MESSAGES) },
  handler: async (ctx, { messageId }) => {
    await ctx.db.delete(messageId)
  },
})

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns all messages for a user, ordered oldest → newest. */
export const getMessagesByUserId = query({
  args: {
    userId: v.id(TABLES.USERS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200
    return await ctx.db
      .query(TABLES.MESSAGES)
      .withIndex(INDEXES.BY_USER_CREATED, (q) => q.eq('userId', args.userId))
      .order('asc')
      .take(limit)
  },
})

/** Returns messages for a specific thread, ordered oldest → newest. */
export const getMessagesByThreadId = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200
    return await ctx.db
      .query(TABLES.MESSAGES)
      .withIndex(INDEXES.BY_THREAD_CREATED, (q) => q.eq('threadId', args.threadId))
      .order('asc')
      .take(limit)
  },
})

/** Returns the count of messages sent today (midnight UTC → now). */
export const getMessageCountToday = query({
  args: {
    userId: v.id(TABLES.USERS),
  },
  handler: async (ctx, args) => {
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const startTs = startOfDay.getTime()

    const messages = await ctx.db
      .query(TABLES.MESSAGES)
      .withIndex(INDEXES.BY_USER_CREATED, (q) =>
        q.eq('userId', args.userId).gte('createdAt', startTs)
      )
      .collect()

    return messages.length
  },
})
