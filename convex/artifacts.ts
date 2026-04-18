import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

/**
 * Structured tool payloads (prospect lists, ads briefs, enrichment results).
 *
 * Artifacts are stored as the canonical form that sub-agents produce; the
 * orchestrator passes `artifactId` around instead of re-inlining large blobs
 * into the model context. Each artifact is tenant-scoped and optionally
 * anchored to an agentRun for lineage.
 */

export const create = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    kind: v.string(),
    data: v.any(),
    runId: v.optional(v.id(TABLES.AGENT_RUNS)),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  returns: v.id(TABLES.ARTIFACTS),
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.ARTIFACTS, {
      tenantId: args.tenantId,
      userId: args.userId,
      runId: args.runId,
      kind: args.kind,
      title: args.title,
      data: args.data,
      summary: args.summary,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const internalCreate = internalMutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    kind: v.string(),
    data: v.any(),
    runId: v.optional(v.id(TABLES.AGENT_RUNS)),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  returns: v.id(TABLES.ARTIFACTS),
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.ARTIFACTS, {
      tenantId: args.tenantId,
      userId: args.userId,
      runId: args.runId,
      kind: args.kind,
      title: args.title,
      data: args.data,
      summary: args.summary,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    artifactId: v.id(TABLES.ARTIFACTS),
    data: v.optional(v.any()),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  returns: v.id(TABLES.ARTIFACTS),
  handler: async (ctx, { artifactId, data, title, summary }) => {
    const patch: Record<string, unknown> = { updatedAt: Date.now() }
    if (data !== undefined) patch.data = data
    if (title !== undefined) patch.title = title
    if (summary !== undefined) patch.summary = summary
    await ctx.db.patch(artifactId, patch)
    return artifactId
  },
})

export const getById = query({
  args: { artifactId: v.id(TABLES.ARTIFACTS) },
  handler: async (ctx, { artifactId }) => {
    return await ctx.db.get(artifactId)
  },
})

export const listForRun = query({
  args: { runId: v.id(TABLES.AGENT_RUNS) },
  handler: async (ctx, { runId }) => {
    return await ctx.db
      .query(TABLES.ARTIFACTS)
      .withIndex(INDEXES.BY_ARTIFACT_RUN, (q) => q.eq('runId', runId))
      .collect()
  },
})

export const listByKind = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    kind: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, kind, limit }) => {
    const take = Math.min(Math.max(limit ?? 20, 1), 100)
    return await ctx.db
      .query(TABLES.ARTIFACTS)
      .withIndex(INDEXES.BY_ARTIFACT_TENANT_KIND, (q) =>
        q.eq('tenantId', tenantId).eq('kind', kind)
      )
      .order('desc')
      .take(take)
  },
})
