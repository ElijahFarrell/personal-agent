import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { CONTEXT_DOC_CATEGORY, INDEXES, SCOPE, TABLES } from './constants'

const categoryValidator = v.union(
  v.literal(CONTEXT_DOC_CATEGORY.BUSINESS_INFO),
  v.literal(CONTEXT_DOC_CATEGORY.PREFERENCES),
  v.literal(CONTEXT_DOC_CATEGORY.REFERENCE_DOCS),
  v.literal(CONTEXT_DOC_CATEGORY.CUSTOM)
)

const scopeValidator = v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER))

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createContextDoc = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    scope: scopeValidator,
    title: v.string(),
    content: v.string(),
    category: categoryValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.CONTEXT_DOCS, {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateContextDoc = mutation({
  args: {
    docId: v.id(TABLES.CONTEXT_DOCS),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    const { docId, ...updates } = args
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )
    await ctx.db.patch(docId, { ...filtered, updatedAt: Date.now() })
  },
})

export const deleteContextDoc = mutation({
  args: {
    docId: v.id(TABLES.CONTEXT_DOCS),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.docId)
  },
})

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getOrgContextDocs = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.CONTEXT_DOCS)
      .withIndex(INDEXES.BY_TENANT_SCOPE, (q) =>
        q.eq('tenantId', tenantId).eq('scope', SCOPE.ORG)
      )
      .collect()
  },
})

export const getUserContextDocs = query({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query(TABLES.CONTEXT_DOCS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('scope'), SCOPE.USER))
      .collect()
  },
})

/**
 * Fetches all context docs visible to a user: org-scoped + their own user-scoped.
 */
export const getAllContextDocsForChat = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
  },
  handler: async (ctx, { tenantId, userId }) => {
    const [orgDocs, userDocs] = await Promise.all([
      ctx.db
        .query(TABLES.CONTEXT_DOCS)
        .withIndex(INDEXES.BY_TENANT_SCOPE, (q) =>
          q.eq('tenantId', tenantId).eq('scope', SCOPE.ORG)
        )
        .collect(),
      ctx.db
        .query(TABLES.CONTEXT_DOCS)
        .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
        .filter((q) => q.eq(q.field('scope'), SCOPE.USER))
        .collect(),
    ])

    return [...orgDocs, ...userDocs]
  },
})

/** Kept for backward compat — returns all docs for a tenant (both scopes). */
export const getContextDocsByTenantId = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query(TABLES.CONTEXT_DOCS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', args.tenantId))
      .collect()
  },
})

export const getContextDoc = query({
  args: {
    docId: v.id(TABLES.CONTEXT_DOCS),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.docId)
  },
})
