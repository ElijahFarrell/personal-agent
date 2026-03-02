import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, ROLE, TABLES, TIER } from './constants'

export const getUserByClerkUserId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    return await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_CLERK_USER_ID, (q) => q.eq('clerkUserId', clerkUserId))
      .unique()
  },
})

export const getUserByTelegramId = query({
  args: { telegramId: v.string() },
  handler: async (ctx, { telegramId }) => {
    return await ctx.db
      .query(TABLES.USERS)
      .filter((q) => q.eq(q.field('telegramId'), telegramId))
      .first()
  },
})

export const createUser = mutation({
  args: {
    clerkUserId: v.string(),
    tenantId: v.id(TABLES.TENANTS),
    email: v.string(),
    role: v.optional(v.union(v.literal(ROLE.OWNER), v.literal(ROLE.MEMBER))),
    telegramId: v.optional(v.string()),
  },
  handler: async (ctx, { clerkUserId, tenantId, email, role, telegramId }) => {
    const existing = await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_CLERK_USER_ID, (q) => q.eq('clerkUserId', clerkUserId))
      .unique()

    if (existing) return existing._id

    return await ctx.db.insert(TABLES.USERS, {
      clerkUserId,
      tenantId,
      email,
      role: role ?? ROLE.MEMBER,
      telegramId,
      createdAt: Date.now(),
    })
  },
})

/**
 * Idempotent: creates tenant + user if they don't exist, returns both IDs.
 *
 * When `orgId` is provided (user belongs to a Clerk Organization), the tenant
 * is keyed by that org ID — multiple users in the same org share the tenant.
 * The first user to join becomes `owner`; subsequent users become `member`.
 *
 * When `orgId` is absent (personal account), `clerkUserId` is used as the
 * tenant key so each personal user gets their own isolated tenant as `owner`.
 */
export const ensureUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { clerkUserId, email, name, orgId }) => {
    const existingUser = await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_CLERK_USER_ID, (q) => q.eq('clerkUserId', clerkUserId))
      .unique()

    if (existingUser) {
      return { userId: existingUser._id, tenantId: existingUser.tenantId }
    }

    const tenantKey = orgId ?? clerkUserId

    const existingTenant = await ctx.db
      .query(TABLES.TENANTS)
      .withIndex(INDEXES.BY_CLERK_ORG_ID, (q) => q.eq('clerkOrgId', tenantKey))
      .unique()

    const isNewTenant = !existingTenant
    const tenantId =
      existingTenant?._id ??
      (await ctx.db.insert(TABLES.TENANTS, {
        clerkOrgId: tenantKey,
        name: name || email,
        tier: TIER.PRO,
        createdAt: Date.now(),
      }))

    const userId = await ctx.db.insert(TABLES.USERS, {
      clerkUserId,
      tenantId,
      email,
      role: isNewTenant ? ROLE.OWNER : ROLE.MEMBER,
      createdAt: Date.now(),
    })

    return { userId, tenantId }
  },
})
