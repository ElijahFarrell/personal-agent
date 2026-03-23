import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

export const getByUserId = query({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query(TABLES.USER_AGENT_SETTINGS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .unique()
  },
})

export const upsert = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    tenantId: v.id(TABLES.TENANTS),
    instructionsByAgentId: v.record(v.string(), v.string()),
  },
  handler: async (ctx, { userId, tenantId, instructionsByAgentId }) => {
    const now = Date.now()
    const existing = await ctx.db
      .query(TABLES.USER_AGENT_SETTINGS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .unique()

    const cleaned = Object.fromEntries(
      Object.entries(instructionsByAgentId).filter(([, v]) => v?.trim())
    ) as Record<string, string>

    if (existing) {
      await ctx.db.patch(existing._id, {
        instructionsByAgentId: cleaned,
        tenantId,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert(TABLES.USER_AGENT_SETTINGS, {
      userId,
      tenantId,
      instructionsByAgentId: cleaned,
      updatedAt: now,
    })
  },
})

export const clearAgent = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    tenantId: v.id(TABLES.TENANTS),
    agentId: v.string(),
  },
  handler: async (ctx, { userId, tenantId, agentId }) => {
    const existing = await ctx.db
      .query(TABLES.USER_AGENT_SETTINGS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .unique()

    if (!existing) return

    const next = { ...existing.instructionsByAgentId }
    delete next[agentId]

    const now = Date.now()
    await ctx.db.patch(existing._id, {
      instructionsByAgentId: next,
      tenantId,
      updatedAt: now,
    })
  },
})
