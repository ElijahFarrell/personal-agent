import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { CHAT_JOB_STATUS, INDEXES, TABLES } from './constants'

export const create = mutation({
  args: {
    threadId: v.string(),
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.CHAT_GENERATION_JOBS, {
      threadId: args.threadId,
      tenantId: args.tenantId,
      userId: args.userId,
      status: CHAT_JOB_STATUS.PENDING,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateStatus = mutation({
  args: {
    jobId: v.id(TABLES.CHAT_GENERATION_JOBS),
    status: v.union(
      v.literal(CHAT_JOB_STATUS.PENDING),
      v.literal(CHAT_JOB_STATUS.RUNNING),
      v.literal(CHAT_JOB_STATUS.COMPLETED),
      v.literal(CHAT_JOB_STATUS.FAILED)
    ),
    progressMessage: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, ...rest }) => {
    const patch: Record<string, unknown> = { updatedAt: Date.now(), ...rest }
    await ctx.db.patch(jobId, patch)
    return jobId
  },
})

export const getById = query({
  args: { jobId: v.id(TABLES.CHAT_GENERATION_JOBS) },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId)
  },
})

/** Latest background job for a thread (for polling). */
export const getLatestForThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query(TABLES.CHAT_GENERATION_JOBS)
      .withIndex(INDEXES.BY_THREAD_CREATED, (q) => q.eq('threadId', threadId))
      .order('desc')
      .first()
  },
})
