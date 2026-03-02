import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { CREDIT_ACTION, CREDIT_TX_TYPE, INDEXES, TABLES, TRIAL } from './constants'

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getBillingByTenantId = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()
  },
})

export const getTrialStatus = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    const billing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()

    if (!billing) return { isOnTrial: false, daysRemaining: 0, trialExpired: false }

    const now = Date.now()
    const isOnTrial = !!billing.trialEndsAt && billing.trialEndsAt > now
    const trialExpired = !!billing.trialEndsAt && billing.trialEndsAt <= now
    const daysRemaining = isOnTrial
      ? Math.ceil((billing.trialEndsAt! - now) / (24 * 60 * 60 * 1000))
      : 0

    return { isOnTrial, daysRemaining, trialExpired }
  },
})

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Initialize billing for a new tenant with a 7-day trial and starter credits.
 * Idempotent — skips if billing record already exists.
 */
export const initializeTrial = mutation({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    const existing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()

    if (existing) return existing._id

    const now = Date.now()
    const billingId = await ctx.db.insert(TABLES.TENANT_BILLING, {
      tenantId,
      creditBalance: TRIAL.INITIAL_CREDITS,
      trialStartedAt: now,
      trialEndsAt: now + TRIAL.DURATION_MS,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert(TABLES.CREDIT_TRANSACTIONS, {
      tenantId,
      type: CREDIT_TX_TYPE.CREDIT,
      amount: TRIAL.INITIAL_CREDITS,
      action: CREDIT_ACTION.TRIAL_GRANT,
      description: `Trial started — ${TRIAL.INITIAL_CREDITS} credits granted for 7-day trial`,
      balanceAfter: TRIAL.INITIAL_CREDITS,
      createdAt: now,
    })

    return billingId
  },
})

/**
 * Initialize billing for a tenant without a trial (e.g. free tier personal accounts).
 * Idempotent — skips if billing record already exists.
 */
export const initializeBilling = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    initialCredits: v.number(),
  },
  handler: async (ctx, { tenantId, initialCredits }) => {
    const existing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()

    if (existing) return existing._id

    const now = Date.now()
    const billingId = await ctx.db.insert(TABLES.TENANT_BILLING, {
      tenantId,
      creditBalance: initialCredits,
      createdAt: now,
      updatedAt: now,
    })

    if (initialCredits > 0) {
      await ctx.db.insert(TABLES.CREDIT_TRANSACTIONS, {
        tenantId,
        type: CREDIT_TX_TYPE.CREDIT,
        amount: initialCredits,
        action: CREDIT_ACTION.ADMIN_GRANT,
        description: `Initial credit grant for new tenant`,
        balanceAfter: initialCredits,
        createdAt: now,
      })
    }

    return billingId
  },
})
