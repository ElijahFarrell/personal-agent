import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { ADS_PIPELINE_RUN_STATUS, INDEXES, TABLES } from './constants'

export const createRun = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    query: v.string(),
    platforms: v.array(v.string()),
    focusArea: v.optional(v.string()),
    requestedEngines: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.ADS_PIPELINE_RUNS, {
      tenantId: args.tenantId,
      userId: args.userId,
      status: ADS_PIPELINE_RUN_STATUS.PENDING,
      currentStage: 'queued',
      query: args.query,
      platforms: args.platforms,
      focusArea: args.focusArea,
      requestedEngines: args.requestedEngines,
      completedEngines: [],
      cachedSearchRefs: [],
      startedAt: now,
      updatedAt: now,
      createdAt: now,
    })
  },
})

export const patchRunProgress = mutation({
  args: {
    runId: v.id(TABLES.ADS_PIPELINE_RUNS),
    status: v.optional(
      v.union(
        v.literal(ADS_PIPELINE_RUN_STATUS.PENDING),
        v.literal(ADS_PIPELINE_RUN_STATUS.SCRAPING),
        v.literal(ADS_PIPELINE_RUN_STATUS.ANALYZING),
        v.literal(ADS_PIPELINE_RUN_STATUS.BUILDING),
        v.literal(ADS_PIPELINE_RUN_STATUS.COMPLETED),
        v.literal(ADS_PIPELINE_RUN_STATUS.FAILED)
      )
    ),
    currentStage: v.optional(v.string()),
    completedEngines: v.optional(v.array(v.string())),
    cachedSearchRefs: v.optional(
      v.array(
        v.object({
          engine: v.string(),
          searchId: v.string(),
          ok: v.boolean(),
          error: v.optional(v.string()),
        })
      )
    ),
    analysisMarkdown: v.optional(v.string()),
    campaignBriefMarkdown: v.optional(v.string()),
    error: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, { runId, ...patch }) => {
    await ctx.db.patch(runId, {
      ...patch,
      updatedAt: Date.now(),
    })
  },
})

export const listRunsForTenant = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    return await ctx.db
      .query(TABLES.ADS_PIPELINE_RUNS)
      .withIndex(INDEXES.BY_ADS_PIPELINE_TENANT_CREATED, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(limit)
  },
})

export const getRun = query({
  args: { runId: v.id(TABLES.ADS_PIPELINE_RUNS) },
  handler: async (ctx, { runId }) => {
    return await ctx.db.get(runId)
  },
})
