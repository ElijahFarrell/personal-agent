import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { BILLING_MODEL, INDEXES, TABLES } from './constants'

/** Default config shape for orgs without a tenantConfigs row (free-tier equivalent). */
const DEFAULT_CONFIG_SHAPE = {
  allowedAgents: ['email', 'research', 'calendar', 'content'] as const,
  allowedIntegrations: ['gmail', 'google-calendar'] as const,
  features: {
    customWorkflows: false,
    deepResearch: false,
    outreachCampaigns: false,
    prospectTable: false,
    exaWebsets: false,
    crmSync: false,
    customSkills: false,
    voiceMode: false,
    workflowBuilder: false,
    scheduledTasks: false,
    videoStudio: false,
    unifiedInbox: false,
    eventTriggers: false,
  },
  limits: {
    maxMembers: 1,
    maxProspectsPerMonth: 10,
    maxWorkflows: 1,
    maxSchedules: 1,
    maxSkills: 5,
    monthlyCredits: 10,
    maxVideoGenerationsPerMonth: 20,
    maxInboxSyncPerDay: 50,
  },
  billingModel: BILLING_MODEL.FRIEND,
}

const featuresValidator = v.object({
  customWorkflows: v.boolean(),
  deepResearch: v.boolean(),
  outreachCampaigns: v.boolean(),
  prospectTable: v.boolean(),
  exaWebsets: v.boolean(),
  crmSync: v.boolean(),
  customSkills: v.boolean(),
  voiceMode: v.boolean(),
  workflowBuilder: v.boolean(),
  scheduledTasks: v.boolean(),
  videoStudio: v.boolean(),
  unifiedInbox: v.boolean(),
  eventTriggers: v.boolean(),
})

const limitsValidator = v.object({
  maxMembers: v.number(),
  maxProspectsPerMonth: v.number(),
  maxWorkflows: v.number(),
  maxSchedules: v.number(),
  maxSkills: v.number(),
  monthlyCredits: v.number(),
  maxVideoGenerationsPerMonth: v.number(),
  maxInboxSyncPerDay: v.number(),
})

const nicheIdValidator = v.union(v.literal('generic'), v.literal('real_estate'))

const nicheOverridesValidator = v.object({
  orchestratorAddendum: v.optional(v.string()),
})

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getByTenantId = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.TENANT_CONFIGS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()
  },
})

/**
 * Returns a sensible default config for orgs without a tenantConfigs row.
 * Used as fallback when getByTenantId returns null.
 */
export const getDefaultConfig = query({
  args: {},
  handler: async () => {
    return {
      allowedAgents: [...DEFAULT_CONFIG_SHAPE.allowedAgents] as string[],
      allowedIntegrations: [...DEFAULT_CONFIG_SHAPE.allowedIntegrations] as string[],
      features: { ...DEFAULT_CONFIG_SHAPE.features },
      limits: { ...DEFAULT_CONFIG_SHAPE.limits },
      billingModel: DEFAULT_CONFIG_SHAPE.billingModel,
      nicheId: 'generic' as const,
      nicheOverrides: undefined,
      fullPlatformAccess: undefined,
    }
  },
})

/**
 * Lists all tenants with their configs and billing for the admin dashboard.
 * Returns tenants even if they have no config (config will be null).
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.db.query(TABLES.TENANTS).collect()
    const results = []

    for (const tenant of tenants) {
      const config = await ctx.db
        .query(TABLES.TENANT_CONFIGS)
        .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenant._id))
        .unique()

      const billing = await ctx.db
        .query(TABLES.TENANT_BILLING)
        .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenant._id))
        .unique()

      const members = await ctx.db
        .query(TABLES.USERS)
        .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenant._id))
        .collect()

      results.push({
        tenant,
        config,
        billing,
        memberCount: members.length,
      })
    }

    return results as Array<{
      tenant: (typeof tenants)[0]
      config: { _id: string; tenantId: string; [key: string]: unknown } | null
      billing: { _id: string; tenantId: string; [key: string]: unknown } | null
      memberCount: number
    }>
  },
})

// ─── Mutations ─────────────────────────────────────────────────────────────────

export const upsertConfig = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    allowedAgents: v.union(v.literal('all'), v.array(v.string())),
    allowedIntegrations: v.union(v.literal('all'), v.array(v.string())),
    features: featuresValidator,
    limits: limitsValidator,
    billingModel: v.union(
      v.literal(BILLING_MODEL.UNLIMITED),
      v.literal(BILLING_MODEL.FLAT),
      v.literal(BILLING_MODEL.USAGE),
      v.literal(BILLING_MODEL.FLAT_PLUS_USAGE),
      v.literal(BILLING_MODEL.TRIAL),
      v.literal(BILLING_MODEL.FRIEND)
    ),
    adminNotes: v.optional(v.string()),
    nicheId: v.optional(nicheIdValidator),
    nicheOverrides: v.optional(nicheOverridesValidator),
    fullPlatformAccess: v.optional(v.boolean()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query(TABLES.TENANT_CONFIGS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', args.tenantId))
      .unique()

    const nicheId = existing
      ? args.nicheId !== undefined
        ? args.nicheId
        : (existing.nicheId ?? 'generic')
      : (args.nicheId ?? 'generic')

    const nicheOverrides =
      args.nicheOverrides !== undefined
        ? args.nicheOverrides
        : existing?.nicheOverrides

    const fullPlatformAccess =
      args.fullPlatformAccess !== undefined
        ? args.fullPlatformAccess
        : existing?.fullPlatformAccess

    const doc = {
      tenantId: args.tenantId,
      allowedAgents: args.allowedAgents,
      allowedIntegrations: args.allowedIntegrations,
      features: args.features,
      limits: args.limits,
      billingModel: args.billingModel,
      adminNotes: args.adminNotes,
      nicheId,
      nicheOverrides,
      fullPlatformAccess,
      updatedAt: now,
      updatedBy: args.updatedBy,
    }

    if (existing) {
      await ctx.db.patch(existing._id, doc)
      return existing._id
    }

    return await ctx.db.insert(TABLES.TENANT_CONFIGS, doc)
  },
})
