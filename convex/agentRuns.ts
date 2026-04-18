import { v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { AGENT_RUN_STATUS, INDEXES, TABLES } from './constants'

/**
 * Durable per-agent invocation store. Mirrors the shape of `convex/chatJobs.ts`
 * but is dedicated to orchestrator + sub-agent lifecycle state.
 *
 * Every public function is tenant-scoped via explicit tenantId; callers are
 * responsible for authenticating the caller (typically the Next.js route
 * handler does this before issuing the mutation).
 */

const statusValidator = v.union(
  v.literal(AGENT_RUN_STATUS.PENDING),
  v.literal(AGENT_RUN_STATUS.RUNNING),
  v.literal(AGENT_RUN_STATUS.SUSPENDED),
  v.literal(AGENT_RUN_STATUS.COMPLETED),
  v.literal(AGENT_RUN_STATUS.FAILED),
  v.literal(AGENT_RUN_STATUS.CANCELLED)
)

export const create = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    agentId: v.string(),
    threadId: v.optional(v.string()),
    parentRunId: v.optional(v.id(TABLES.AGENT_RUNS)),
    title: v.optional(v.string()),
    input: v.optional(v.any()),
    tracingTags: v.optional(v.array(v.string())),
  },
  returns: v.id(TABLES.AGENT_RUNS),
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.AGENT_RUNS, {
      tenantId: args.tenantId,
      userId: args.userId,
      agentId: args.agentId,
      threadId: args.threadId,
      parentRunId: args.parentRunId,
      title: args.title,
      input: args.input,
      tracingTags: args.tracingTags,
      status: AGENT_RUN_STATUS.PENDING,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const internalCreate = internalMutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    agentId: v.string(),
    threadId: v.optional(v.string()),
    parentRunId: v.optional(v.id(TABLES.AGENT_RUNS)),
    title: v.optional(v.string()),
    input: v.optional(v.any()),
    tracingTags: v.optional(v.array(v.string())),
  },
  returns: v.id(TABLES.AGENT_RUNS),
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.AGENT_RUNS, {
      tenantId: args.tenantId,
      userId: args.userId,
      agentId: args.agentId,
      threadId: args.threadId,
      parentRunId: args.parentRunId,
      title: args.title,
      input: args.input,
      tracingTags: args.tracingTags,
      status: AGENT_RUN_STATUS.PENDING,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateStatus = mutation({
  args: {
    runId: v.id(TABLES.AGENT_RUNS),
    status: statusValidator,
    error: v.optional(v.string()),
    output: v.optional(v.any()),
  },
  returns: v.id(TABLES.AGENT_RUNS),
  handler: async (ctx, { runId, status, error, output }) => {
    const now = Date.now()
    const patch: Record<string, unknown> = { status, updatedAt: now }
    if (error !== undefined) patch.error = error
    if (output !== undefined) patch.output = output
    if (status === AGENT_RUN_STATUS.RUNNING) patch.startedAt = now
    if (
      status === AGENT_RUN_STATUS.COMPLETED ||
      status === AGENT_RUN_STATUS.FAILED ||
      status === AGENT_RUN_STATUS.CANCELLED
    ) {
      patch.completedAt = now
    }
    await ctx.db.patch(runId, patch)
    return runId
  },
})

/** Shallow merge of externalIds (websetId, apolloJobId, mastraRunId, ...). */
export const setExternalIds = mutation({
  args: {
    runId: v.id(TABLES.AGENT_RUNS),
    externalIds: v.record(v.string(), v.string()),
  },
  returns: v.id(TABLES.AGENT_RUNS),
  handler: async (ctx, { runId, externalIds }) => {
    const existing = await ctx.db.get(runId)
    if (!existing) throw new Error(`agentRun ${runId} not found`)
    const merged = { ...(existing.externalIds ?? {}), ...externalIds }
    await ctx.db.patch(runId, {
      externalIds: merged,
      updatedAt: Date.now(),
    })
    return runId
  },
})

export const setPlan = mutation({
  args: {
    runId: v.id(TABLES.AGENT_RUNS),
    plan: v.any(),
  },
  returns: v.id(TABLES.AGENT_RUNS),
  handler: async (ctx, { runId, plan }) => {
    await ctx.db.patch(runId, { plan, updatedAt: Date.now() })
    return runId
  },
})

export const getById = query({
  args: { runId: v.id(TABLES.AGENT_RUNS) },
  handler: async (ctx, { runId }) => {
    return await ctx.db.get(runId)
  },
})

/** Run + direct children (one level). Orchestrator UI uses this for the tree. */
export const getWithChildren = query({
  args: { runId: v.id(TABLES.AGENT_RUNS) },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId)
    if (!run) return null
    const children = await ctx.db
      .query(TABLES.AGENT_RUNS)
      .withIndex(INDEXES.BY_PARENT_RUN_ID, (q) => q.eq('parentRunId', runId))
      .collect()
    return { run, children }
  },
})

export const listRecent = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit }) => {
    const take = Math.min(Math.max(limit ?? 20, 1), 100)
    return await ctx.db
      .query(TABLES.AGENT_RUNS)
      .withIndex(INDEXES.BY_TENANT_UPDATED, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(take)
  },
})

/**
 * Most-recent non-terminal run for a user, optionally filtered by agent ids.
 * Tools use this to locate "the current run I belong to" when they need to
 * persist external ids (Exa websetId, Apollo jobId) without threading the
 * runId through every call site.
 *
 * Best-effort: if multiple delegations are in flight concurrently the caller
 * should thread the runId explicitly. Good enough for single-user supervisor
 * delegations under the current request/response model.
 */
export const getActiveForUser = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    agentIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { tenantId, userId, agentIds }) => {
    const rows = await ctx.db
      .query(TABLES.AGENT_RUNS)
      .withIndex(INDEXES.BY_TENANT_UPDATED, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(50)

    for (const row of rows) {
      if (row.userId !== userId) continue
      if (
        row.status !== AGENT_RUN_STATUS.RUNNING &&
        row.status !== AGENT_RUN_STATUS.PENDING
      ) {
        continue
      }
      if (agentIds && agentIds.length > 0 && !agentIds.includes(row.agentId)) {
        continue
      }
      return row
    }
    return null
  },
})

export const listByThread = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { threadId, limit }) => {
    const take = Math.min(Math.max(limit ?? 20, 1), 100)
    return await ctx.db
      .query(TABLES.AGENT_RUNS)
      .withIndex(INDEXES.BY_THREAD_ID, (q) => q.eq('threadId', threadId))
      .order('desc')
      .take(take)
  },
})

/**
 * List recent agentRuns that have an Exa websetId persisted in `externalIds`.
 * Used by the `pullPastWebsets` cron to know which websets to sync into the
 * `websetItems` table. Convex can't index into JSON fields, so we filter in
 * memory — cap the scan to the most recently updated 500 rows which is ample
 * for daily backfills.
 */
export const listRunsWithWebsetId = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const take = Math.min(Math.max(limit ?? 500, 1), 2000)
    const rows = await ctx.db
      .query(TABLES.AGENT_RUNS)
      .order('desc')
      .take(take)

    const out: Array<{
      runId: typeof rows[number]['_id']
      tenantId: typeof rows[number]['tenantId']
      websetId: string
      title?: string
    }> = []

    for (const row of rows) {
      const websetId = row.externalIds?.websetId
      if (!websetId) continue
      out.push({
        runId: row._id,
        tenantId: row.tenantId,
        websetId,
        title: row.title,
      })
    }
    return out
  },
})

/** User-initiated cancel; marks row + best-effort cancels child runs. */
export const cancel = mutation({
  args: { runId: v.id(TABLES.AGENT_RUNS) },
  returns: v.id(TABLES.AGENT_RUNS),
  handler: async (ctx, { runId }) => {
    const now = Date.now()
    await ctx.db.patch(runId, {
      status: AGENT_RUN_STATUS.CANCELLED,
      updatedAt: now,
      completedAt: now,
    })
    const children = await ctx.db
      .query(TABLES.AGENT_RUNS)
      .withIndex(INDEXES.BY_PARENT_RUN_ID, (q) => q.eq('parentRunId', runId))
      .collect()
    for (const child of children) {
      if (
        child.status === AGENT_RUN_STATUS.COMPLETED ||
        child.status === AGENT_RUN_STATUS.FAILED ||
        child.status === AGENT_RUN_STATUS.CANCELLED
      ) {
        continue
      }
      await ctx.db.patch(child._id, {
        status: AGENT_RUN_STATUS.CANCELLED,
        updatedAt: now,
        completedAt: now,
      })
    }
    return runId
  },
})
