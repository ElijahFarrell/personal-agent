/**
 * Convex storage for Mastra workflow suspend/resume snapshots.
 * Replaces LibSQL/Turso for workflow state persistence.
 */
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

// ─── Persist ──────────────────────────────────────────────────────────────────

export const persist = mutation({
  args: {
    runId: v.string(),
    workflowName: v.string(),
    resourceId: v.optional(v.string()),
    snapshot: v.string(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const createdAt = args.createdAt ?? now
    const updatedAt = args.updatedAt ?? now

    const existing = await ctx.db
      .query(TABLES.WORKFLOW_SNAPSHOTS)
      .withIndex(INDEXES.BY_WORKFLOW_RUN, (q) =>
        q.eq('workflowName', args.workflowName).eq('runId', args.runId)
      )
      .unique()

    const doc = {
      runId: args.runId,
      workflowName: args.workflowName,
      resourceId: args.resourceId,
      snapshot: args.snapshot,
      createdAt,
      updatedAt,
    }

    if (existing) {
      await ctx.db.patch(existing._id, doc)
    } else {
      await ctx.db.insert(TABLES.WORKFLOW_SNAPSHOTS, doc)
    }
  },
})

// ─── Load ─────────────────────────────────────────────────────────────────────

export const load = query({
  args: {
    workflowName: v.string(),
    runId: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query(TABLES.WORKFLOW_SNAPSHOTS)
      .withIndex(INDEXES.BY_WORKFLOW_RUN, (q) =>
        q.eq('workflowName', args.workflowName).eq('runId', args.runId)
      )
      .unique()
    return doc
  },
})

// ─── Update state (merge opts into snapshot) ───────────────────────────────────

export const updateState = mutation({
  args: {
    workflowName: v.string(),
    runId: v.string(),
    snapshotPatch: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query(TABLES.WORKFLOW_SNAPSHOTS)
      .withIndex(INDEXES.BY_WORKFLOW_RUN, (q) =>
        q.eq('workflowName', args.workflowName).eq('runId', args.runId)
      )
      .unique()

    if (!existing) return null

    const now = Date.now()
    await ctx.db.patch(existing._id, {
      snapshot: args.snapshotPatch,
      updatedAt: now,
    })
    return JSON.parse(args.snapshotPatch) as Record<string, unknown>
  },
})

// ─── Update results (merge step result into snapshot) ───────────────────────────

export const updateResults = mutation({
  args: {
    workflowName: v.string(),
    runId: v.string(),
    snapshotWithResults: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query(TABLES.WORKFLOW_SNAPSHOTS)
      .withIndex(INDEXES.BY_WORKFLOW_RUN, (q) =>
        q.eq('workflowName', args.workflowName).eq('runId', args.runId)
      )
      .unique()

    if (!existing) return null

    const now = Date.now()
    await ctx.db.patch(existing._id, {
      snapshot: args.snapshotWithResults,
      updatedAt: now,
    })
    return JSON.parse(args.snapshotWithResults) as Record<string, unknown>
  },
})

// ─── Get by ID ────────────────────────────────────────────────────────────────

export const getById = query({
  args: {
    runId: v.string(),
    workflowName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.workflowName) {
      const doc = await ctx.db
        .query(TABLES.WORKFLOW_SNAPSHOTS)
        .withIndex(INDEXES.BY_WORKFLOW_RUN, (q) =>
          q.eq('workflowName', args.workflowName!).eq('runId', args.runId)
        )
        .unique()
      return doc
    }
    const doc = await ctx.db
      .query(TABLES.WORKFLOW_SNAPSHOTS)
      .withIndex(INDEXES.BY_SNAPSHOT_RUN_ID, (q) => q.eq('runId', args.runId))
      .first()
    return doc
  },
})

// ─── List ────────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    workflowName: v.optional(v.string()),
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number()),
    resourceId: v.optional(v.string()),
    page: v.optional(v.number()),
    perPage: v.optional(v.union(v.number(), v.literal(false))),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query(TABLES.WORKFLOW_SNAPSHOTS)

    if (args.workflowName) {
      q = q.filter((q) => q.eq(q.field('workflowName'), args.workflowName))
    }
    if (args.fromDate !== undefined) {
      q = q.filter((q) => q.gte(q.field('createdAt'), args.fromDate!))
    }
    if (args.toDate !== undefined) {
      q = q.filter((q) => q.lte(q.field('createdAt'), args.toDate!))
    }
    if (args.resourceId !== undefined) {
      q = q.filter((q) => q.eq(q.field('resourceId'), args.resourceId))
    }

    const all = await q.order('desc').collect()
    const total = all.length

    const perPage = args.perPage ?? (args.page !== undefined ? 40 : false)
    const page = args.page ?? 0
    const offset =
      perPage === false ? 0 : Math.min(page * (perPage as number), all.length)
    const limit = perPage === false ? all.length : (perPage as number)
    const runs = all.slice(offset, offset + limit)

    return {
      runs: runs.map((r) => ({
        workflowName: r.workflowName,
        runId: r.runId,
        snapshot: r.snapshot,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        resourceId: r.resourceId,
      })),
      total,
      page,
      perPage,
      hasMore: perPage !== false && offset + runs.length < total,
    }
  },
})

// ─── Clear all (for testing / dangerouslyClearAll) ─────────────────────────────

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query(TABLES.WORKFLOW_SNAPSHOTS).collect()
    for (const doc of docs) {
      await ctx.db.delete(doc._id)
    }
  },
})

// ─── Delete ──────────────────────────────────────────────────────────────────

export const deleteById = mutation({
  args: {
    runId: v.string(),
    workflowName: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query(TABLES.WORKFLOW_SNAPSHOTS)
      .withIndex(INDEXES.BY_WORKFLOW_RUN, (q) =>
        q.eq('workflowName', args.workflowName).eq('runId', args.runId)
      )
      .unique()
    if (doc) {
      await ctx.db.delete(doc._id)
    }
  },
})
