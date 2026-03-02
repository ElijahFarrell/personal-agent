import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createThread = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    tenantId: v.id(TABLES.TENANTS),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.THREADS, {
      userId: args.userId,
      tenantId: args.tenantId,
      title: args.title ?? 'New conversation',
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateThreadTitle = mutation({
  args: {
    threadId: v.id(TABLES.THREADS),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { title: args.title })
  },
})

export const touchThread = mutation({
  args: {
    threadId: v.id(TABLES.THREADS),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { updatedAt: Date.now() })
  },
})

export const deleteThread = mutation({
  args: {
    threadId: v.id(TABLES.THREADS),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query(TABLES.MESSAGES)
      .withIndex(INDEXES.BY_THREAD_CREATED, (q) => q.eq('threadId', args.threadId))
      .collect()

    await Promise.all(messages.map((m) => ctx.db.delete(m._id)))
    await ctx.db.delete(args.threadId)
  },
})

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getThreadsByUserId = query({
  args: {
    userId: v.id(TABLES.USERS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    return await ctx.db
      .query(TABLES.THREADS)
      .withIndex(INDEXES.BY_USER_UPDATED, (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)
  },
})

export const getThread = query({
  args: {
    threadId: v.id(TABLES.THREADS),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId)
  },
})
