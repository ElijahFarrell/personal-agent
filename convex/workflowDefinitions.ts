import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listByTenantId = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.WORKFLOW_DEFINITIONS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .collect()
  },
})

export const listByUserId = query({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query(TABLES.WORKFLOW_DEFINITIONS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})

export const getById = query({
  args: { workflowId: v.id(TABLES.WORKFLOW_DEFINITIONS) },
  handler: async (ctx, { workflowId }) => {
    return await ctx.db.get(workflowId)
  },
})

// ─── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    name: v.string(),
    description: v.optional(v.string()),
    definition: v.any(),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.WORKFLOW_DEFINITIONS, {
      tenantId: args.tenantId,
      userId: args.userId,
      name: args.name,
      description: args.description,
      definition: args.definition,
      isPublished: args.isPublished ?? false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    workflowId: v.id(TABLES.WORKFLOW_DEFINITIONS),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    definition: v.optional(v.any()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workflowId, ...updates } = args
    const existing = await ctx.db.get(workflowId)
    if (!existing) throw new Error('Workflow not found')

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>
    if (Object.keys(filtered).length === 0) return workflowId

    const newVersion =
      'definition' in filtered ? existing.version + 1 : existing.version

    await ctx.db.patch(workflowId, {
      ...filtered,
      version: newVersion,
      updatedAt: Date.now(),
    } as Record<string, unknown>)
    return workflowId
  },
})

export const remove = mutation({
  args: { workflowId: v.id(TABLES.WORKFLOW_DEFINITIONS) },
  handler: async (ctx, { workflowId }) => {
    const existing = await ctx.db.get(workflowId)
    if (!existing) throw new Error('Workflow not found')
    await ctx.db.delete(workflowId)
    return workflowId
  },
})
