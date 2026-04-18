import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

/**
 * Append-only milestone log for an agentRun. The run viewer subscribes to
 * `listForRun` for live updates; tools append here instead of patching the
 * parent run so we preserve ordering across concurrent sub-agent writes.
 */

export const append = mutation({
  args: {
    runId: v.id(TABLES.AGENT_RUNS),
    tenantId: v.id(TABLES.TENANTS),
    kind: v.string(),
    message: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  returns: v.id(TABLES.RUN_PROGRESS),
  handler: async (ctx, args) => {
    return await ctx.db.insert(TABLES.RUN_PROGRESS, {
      runId: args.runId,
      tenantId: args.tenantId,
      kind: args.kind,
      message: args.message,
      data: args.data,
      createdAt: Date.now(),
    })
  },
})

export const internalAppend = internalMutation({
  args: {
    runId: v.id(TABLES.AGENT_RUNS),
    tenantId: v.id(TABLES.TENANTS),
    kind: v.string(),
    message: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  returns: v.id(TABLES.RUN_PROGRESS),
  handler: async (ctx, args) => {
    return await ctx.db.insert(TABLES.RUN_PROGRESS, {
      runId: args.runId,
      tenantId: args.tenantId,
      kind: args.kind,
      message: args.message,
      data: args.data,
      createdAt: Date.now(),
    })
  },
})

export const listForRun = query({
  args: {
    runId: v.id(TABLES.AGENT_RUNS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { runId, limit }) => {
    const take = Math.min(Math.max(limit ?? 200, 1), 500)
    return await ctx.db
      .query(TABLES.RUN_PROGRESS)
      .withIndex(INDEXES.BY_RUN_CREATED, (q) => q.eq('runId', runId))
      .order('asc')
      .take(take)
  },
})
