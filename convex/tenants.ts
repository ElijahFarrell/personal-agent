import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, TABLES, TIER } from './constants'

export const getTenantByClerkOrgId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, { clerkOrgId }) => {
    return await ctx.db
      .query(TABLES.TENANTS)
      .withIndex(INDEXES.BY_CLERK_ORG_ID, (q) => q.eq('clerkOrgId', clerkOrgId))
      .unique()
  },
})

export const createTenant = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    tier: v.optional(
      v.union(
        v.literal(TIER.FREE),
        v.literal(TIER.PRO),
        v.literal(TIER.ENTERPRISE)
      )
    ),
  },
  handler: async (ctx, { clerkOrgId, name, tier }) => {
    const existing = await ctx.db
      .query(TABLES.TENANTS)
      .withIndex(INDEXES.BY_CLERK_ORG_ID, (q) => q.eq('clerkOrgId', clerkOrgId))
      .unique()

    if (existing) return existing._id

    return await ctx.db.insert(TABLES.TENANTS, {
      clerkOrgId,
      name,
      tier: tier ?? TIER.FREE,
      createdAt: Date.now(),
    })
  },
})
