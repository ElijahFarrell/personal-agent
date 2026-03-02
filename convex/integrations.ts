import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, INTEGRATION_STATUS, TABLES } from './constants'

export const getIntegrationsByUserId = query({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query(TABLES.USER_INTEGRATIONS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .collect()
  },
})

export const getIntegrationsByTenantId = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.USER_INTEGRATIONS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .collect()
  },
})

export const upsertIntegration = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    tenantId: v.id(TABLES.TENANTS),
    provider: v.string(),
    connectionId: v.string(),
  },
  handler: async (ctx, { userId, tenantId, provider, connectionId }) => {
    const existing = await ctx.db
      .query(TABLES.USER_INTEGRATIONS)
      .withIndex(INDEXES.BY_CONNECTION_ID, (q) => q.eq('connectionId', connectionId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: INTEGRATION_STATUS.ACTIVE,
        userId,
        tenantId,
      })
      return existing._id
    }

    return await ctx.db.insert(TABLES.USER_INTEGRATIONS, {
      userId,
      tenantId,
      provider,
      connectionId,
      status: INTEGRATION_STATUS.ACTIVE,
      connectedAt: Date.now(),
    })
  },
})

export const deleteIntegrationByProvider = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    provider: v.string(),
  },
  handler: async (ctx, { userId, provider }) => {
    const integrations = await ctx.db
      .query(TABLES.USER_INTEGRATIONS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .collect()

    const match = integrations.find((i) => i.provider === provider)
    if (match) {
      await ctx.db.delete(match._id)
    }
  },
})

export const markNeedsReconnect = mutation({
  args: { connectionId: v.string() },
  handler: async (ctx, { connectionId }) => {
    const integration = await ctx.db
      .query(TABLES.USER_INTEGRATIONS)
      .withIndex(INDEXES.BY_CONNECTION_ID, (q) => q.eq('connectionId', connectionId))
      .unique()

    if (integration) {
      await ctx.db.patch(integration._id, {
        status: INTEGRATION_STATUS.NEEDS_RECONNECT,
      })
    }
  },
})
