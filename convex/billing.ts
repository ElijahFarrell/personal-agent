import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  CREDIT_ACTION,
  CREDIT_TX_TYPE,
  INDEXES,
  SUBSCRIPTION_STATUS,
  TABLES,
  TIER,
  TIER_CREDITS,
  TRIAL,
} from './constants'

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

/**
 * Save Stripe customer and subscription IDs to tenant billing.
 * Called from admin API when creating a subscription.
 */
export const setStripeIds = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    subscriptionStatus: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    monthlyBasePrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const billing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', args.tenantId))
      .unique()

    if (!billing) throw new Error('Billing record not found')

    const now = Date.now()
    const status =
      (args.subscriptionStatus as
        | 'active'
        | 'canceled'
        | 'past_due'
        | 'trialing') ?? SUBSCRIPTION_STATUS.ACTIVE
    await ctx.db.patch(billing._id, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStatus: status,
      currentPeriodEnd: args.currentPeriodEnd,
      monthlyBasePrice: args.monthlyBasePrice,
      updatedAt: now,
    })

    return billing._id
  },
})

/**
 * Update subscription status (e.g. on payment failure).
 * Called from Stripe webhook.
 */
export const updateSubscriptionStatus = mutation({
  args: {
    stripeCustomerId: v.string(),
    subscriptionStatus: v.string(),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const billing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_STRIPE_CUSTOMER_ID, (q) =>
        q.eq('stripeCustomerId', args.stripeCustomerId)
      )
      .unique()

    if (!billing) return null

    const now = Date.now()
    const status = args.subscriptionStatus as
      | 'active'
      | 'canceled'
      | 'past_due'
      | 'trialing'
    await ctx.db.patch(billing._id, {
      subscriptionStatus: status,
      currentPeriodEnd: args.currentPeriodEnd,
      updatedAt: now,
    })

    return billing._id
  },
})

/**
 * Replenish credits on invoice.paid (monthly renewal).
 * Resets credit balance to the given amount.
 */
export const replenishCredits = mutation({
  args: {
    stripeCustomerId: v.string(),
    creditsAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const billing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_STRIPE_CUSTOMER_ID, (q) =>
        q.eq('stripeCustomerId', args.stripeCustomerId)
      )
      .unique()

    if (!billing) return null

    const now = Date.now()
    const isUnlimited = args.creditsAmount < 0
    const newBalance = isUnlimited ? 0 : args.creditsAmount

    await ctx.db.patch(billing._id, {
      creditBalance: newBalance,
      unlimitedCredits: isUnlimited ? true : undefined,
      updatedAt: now,
    })

    const creditDelta = isUnlimited ? 0 : newBalance - billing.creditBalance
    if (creditDelta > 0) {
      await ctx.db.insert(TABLES.CREDIT_TRANSACTIONS, {
        tenantId: billing.tenantId,
        type: CREDIT_TX_TYPE.CREDIT,
        amount: creditDelta,
        action: CREDIT_ACTION.PURCHASE,
        description: isUnlimited
          ? 'Upgraded to unlimited credits'
          : 'Monthly credit replenishment',
        balanceAfter: newBalance,
        createdAt: now,
      })
    }

    return billing._id
  },
})

/**
 * Downgrade tenant when subscription is canceled.
 * Clears Stripe IDs, sets credits to free tier.
 */
export const downgradeTenant = mutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const billing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_STRIPE_CUSTOMER_ID, (q) =>
        q.eq('stripeCustomerId', args.stripeCustomerId)
      )
      .unique()

    if (!billing) return null

    const tenant = await ctx.db.get(billing.tenantId)
    if (!tenant) return billing._id

    const now = Date.now()
    const freeCredits = TIER_CREDITS[TIER.FREE]

    await ctx.db.patch(tenant._id, { tier: TIER.FREE })
    await ctx.db.patch(billing._id, {
      stripeCustomerId: undefined,
      stripeSubscriptionId: undefined,
      subscriptionStatus: SUBSCRIPTION_STATUS.CANCELED,
      creditBalance: freeCredits,
      unlimitedCredits: false,
      trialStartedAt: undefined,
      trialEndsAt: undefined,
      updatedAt: now,
    })

    await ctx.db.insert(TABLES.CREDIT_TRANSACTIONS, {
      tenantId: billing.tenantId,
      type: CREDIT_TX_TYPE.CREDIT,
      amount: freeCredits - billing.creditBalance,
      action: CREDIT_ACTION.ADMIN_GRANT,
      description: 'Subscription canceled — downgraded to free tier',
      balanceAfter: freeCredits,
      createdAt: now,
    })

    return billing._id
  },
})

/**
 * Extend trial end date. Called from admin API.
 */
export const extendTrial = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    additionalDays: v.number(),
  },
  handler: async (ctx, args) => {
    const billing = await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', args.tenantId))
      .unique()

    if (!billing) return null

    const now = Date.now()
    const currentEnd = billing.trialEndsAt ?? now
    const newEnd =
      currentEnd + args.additionalDays * 24 * 60 * 60 * 1000

    await ctx.db.patch(billing._id, {
      trialEndsAt: newEnd,
      updatedAt: now,
    })

    return billing._id
  },
})

/**
 * Get billing by Stripe customer ID (for webhook lookups).
 */
export const getBillingByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    return await ctx.db
      .query(TABLES.TENANT_BILLING)
      .withIndex(INDEXES.BY_STRIPE_CUSTOMER_ID, (q) =>
        q.eq('stripeCustomerId', stripeCustomerId)
      )
      .unique()
  },
})
