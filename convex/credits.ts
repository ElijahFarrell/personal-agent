import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { CREDIT_ACTION, CREDIT_COSTS, CREDIT_TX_TYPE, INDEXES, TABLES } from './constants'

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getCreditBalance = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    const billing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()

    return billing?.creditBalance ?? 0
  },
})

export const hasEnoughCredits = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    action: v.union(
      v.literal(CREDIT_ACTION.CHAT_MESSAGE),
      v.literal(CREDIT_ACTION.TOOL_EXECUTION)
    ),
  },
  handler: async (ctx, { tenantId, action }) => {
    const billing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()

    if (!billing) return false

    const cost = CREDIT_COSTS[action]
    return billing.creditBalance >= cost
  },
})

export const getTransactionHistory = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit }) => {
    return await ctx.db
      .query(TABLES.CREDIT_TRANSACTIONS)
      .withIndex(INDEXES.BY_TENANT_CREATED, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(limit ?? 50)
  },
})

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Atomically deduct credits for a given action.
 * Returns `{ success, balanceAfter }`. Rejects if insufficient balance.
 */
export const deductCredits = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    action: v.union(
      v.literal(CREDIT_ACTION.CHAT_MESSAGE),
      v.literal(CREDIT_ACTION.TOOL_EXECUTION)
    ),
  },
  handler: async (ctx, { tenantId, userId, action }) => {
    const billing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()

    if (!billing) {
      return { success: false, balanceAfter: 0, error: 'No billing record found' }
    }

    const cost = CREDIT_COSTS[action]
    if (billing.creditBalance < cost) {
      return { success: false, balanceAfter: billing.creditBalance, error: 'Insufficient credits' }
    }

    const newBalance = billing.creditBalance - cost
    const now = Date.now()

    await ctx.db.patch(billing._id, {
      creditBalance: newBalance,
      updatedAt: now,
    })

    await ctx.db.insert(TABLES.CREDIT_TRANSACTIONS, {
      tenantId,
      userId,
      type: CREDIT_TX_TYPE.DEBIT,
      amount: cost,
      action,
      description: `${action} — ${cost} credit${cost > 1 ? 's' : ''} used`,
      balanceAfter: newBalance,
      createdAt: now,
    })

    return { success: true, balanceAfter: newBalance }
  },
})

/** Add credits to a tenant (for purchases or admin grants). */
export const addCredits = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    amount: v.number(),
    action: v.union(
      v.literal(CREDIT_ACTION.PURCHASE),
      v.literal(CREDIT_ACTION.ADMIN_GRANT)
    ),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, amount, action, description }) => {
    if (amount <= 0) throw new Error('Credit amount must be positive')

    const billing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()

    if (!billing) throw new Error('No billing record found for tenant')

    const newBalance = billing.creditBalance + amount
    const now = Date.now()

    await ctx.db.patch(billing._id, {
      creditBalance: newBalance,
      updatedAt: now,
    })

    await ctx.db.insert(TABLES.CREDIT_TRANSACTIONS, {
      tenantId,
      type: CREDIT_TX_TYPE.CREDIT,
      amount,
      action,
      description: description ?? `${amount} credits added via ${action}`,
      balanceAfter: newBalance,
      createdAt: now,
    })

    return { success: true, balanceAfter: newBalance }
  },
})
