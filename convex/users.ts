import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { CREDIT_ACTION, CREDIT_TX_TYPE, INDEXES, ROLE, TABLES, TIER, TIER_CREDITS, TRIAL } from './constants'

export const getUserByClerkUserId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    return await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_CLERK_USER_ID, (q) => q.eq('clerkUserId', clerkUserId))
      .unique()
  },
})

export const getUsersByTenantId = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .collect()
  },
})

export const getUserByTelegramId = query({
  args: { telegramId: v.string() },
  handler: async (ctx, { telegramId }) => {
    return await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_TELEGRAM_ID, (q) => q.eq('telegramId', telegramId))
      .first()
  },
})

export const linkTelegramId = mutation({
  args: {
    clerkUserId: v.string(),
    telegramId: v.string(),
  },
  handler: async (ctx, { clerkUserId, telegramId }) => {
    const existingWithTelegram = await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_TELEGRAM_ID, (q) => q.eq('telegramId', telegramId))
      .first()
    if (existingWithTelegram && existingWithTelegram.clerkUserId !== clerkUserId) {
      throw new Error('This Telegram account is already linked to another user')
    }

    const user = await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_CLERK_USER_ID, (q) => q.eq('clerkUserId', clerkUserId))
      .unique()
    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, { telegramId })
    return { success: true }
  },
})

export const unlinkTelegramId = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_CLERK_USER_ID, (q) => q.eq('clerkUserId', clerkUserId))
      .unique()
    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, { telegramId: undefined })
    return { success: true }
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
    const isOrgAccount = !!orgId
    const now = Date.now()

    const tenantId =
      existingTenant?._id ??
      (await ctx.db.insert(TABLES.TENANTS, {
        clerkOrgId: tenantKey,
        name: name || email,
        tier: isOrgAccount ? TIER.PRO : TIER.FREE,
        createdAt: now,
      }))

    if (isNewTenant) {
      const initialCredits = isOrgAccount
        ? TRIAL.INITIAL_CREDITS
        : TIER_CREDITS[TIER.FREE]

      await ctx.db.insert(TABLES.TENANT_BILLING, {
        tenantId,
        creditBalance: initialCredits,
        trialStartedAt: isOrgAccount ? now : undefined,
        trialEndsAt: isOrgAccount ? now + TRIAL.DURATION_MS : undefined,
        createdAt: now,
        updatedAt: now,
      })

      await ctx.db.insert(TABLES.CREDIT_TRANSACTIONS, {
        tenantId,
        type: CREDIT_TX_TYPE.CREDIT,
        amount: initialCredits,
        action: isOrgAccount ? CREDIT_ACTION.TRIAL_GRANT : CREDIT_ACTION.ADMIN_GRANT,
        description: isOrgAccount
          ? `7-day business trial started — ${initialCredits} credits granted`
          : `Free tier initialized with ${initialCredits} credits`,
        balanceAfter: initialCredits,
        createdAt: now,
      })
    }

    const userId = await ctx.db.insert(TABLES.USERS, {
      clerkUserId,
      tenantId,
      email,
      role: isNewTenant ? ROLE.OWNER : ROLE.MEMBER,
      createdAt: now,
    })

    return { userId, tenantId }
  },
})
