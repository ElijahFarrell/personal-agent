import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import {
  INDEXES,
  SCOPE,
  TABLES,
  WORKSPACE_DOC_STATUS,
  WORKSPACE_DOC_TYPE,
} from './constants'

const scopeValidator = v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER))

const typeValidator = v.union(
  v.literal(WORKSPACE_DOC_TYPE.PDF),
  v.literal(WORKSPACE_DOC_TYPE.VIDEO),
  v.literal(WORKSPACE_DOC_TYPE.AUDIO),
  v.literal(WORKSPACE_DOC_TYPE.IMAGE),
  v.literal(WORKSPACE_DOC_TYPE.WEBPAGE),
  v.literal(WORKSPACE_DOC_TYPE.YOUTUBE),
  v.literal(WORKSPACE_DOC_TYPE.TEXT),
  v.literal(WORKSPACE_DOC_TYPE.NOTE)
)

const statusValidator = v.union(
  v.literal(WORKSPACE_DOC_STATUS.PENDING),
  v.literal(WORKSPACE_DOC_STATUS.PROCESSING),
  v.literal(WORKSPACE_DOC_STATUS.READY),
  v.literal(WORKSPACE_DOC_STATUS.ERROR)
)

async function assertUserBelongsToTenant(
  ctx: { db: { get: (id: Id<'users'>) => Promise<{ tenantId: Id<'tenants'> } | null> } },
  userId: Id<'users'>,
  tenantId: Id<'tenants'>
) {
  const user = await ctx.db.get(userId)
  if (!user || user.tenantId !== tenantId) {
    throw new Error('Unauthorized')
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Step 1 of file upload: get a short-lived POST URL for Convex file storage. */
export const generateWorkspaceUploadUrl = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
  },
  handler: async (ctx, args) => {
    await assertUserBelongsToTenant(ctx, args.userId, args.tenantId)
    return await ctx.storage.generateUploadUrl()
  },
})

export const createWorkspaceDocument = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    scope: scopeValidator,
    title: v.string(),
    type: typeValidator,
    sourceUrl: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    blobUrl: v.optional(v.string()),
    extractedText: v.optional(v.string()),
    summary: v.optional(v.string()),
    transcript: v.optional(v.string()),
    folderId: v.optional(v.id(TABLES.WORKSPACE_FOLDERS)),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    status: v.optional(statusValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await assertUserBelongsToTenant(ctx, args.userId, args.tenantId)
    const now = Date.now()
    const status = args.status ?? WORKSPACE_DOC_STATUS.PENDING
    const { status: _s, ...rest } = args
    return await ctx.db.insert(TABLES.WORKSPACE_DOCUMENTS, {
      ...rest,
      status,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateWorkspaceDocument = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    docId: v.id(TABLES.WORKSPACE_DOCUMENTS),
    title: v.optional(v.string()),
    extractedText: v.optional(v.string()),
    summary: v.optional(v.string()),
    transcript: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    folderId: v.optional(v.union(v.id(TABLES.WORKSPACE_FOLDERS), v.null())),
    status: v.optional(statusValidator),
    processingError: v.optional(v.union(v.string(), v.null())),
    chunkCount: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId)
    if (!doc || doc.tenantId !== args.tenantId) {
      throw new Error('Document not found')
    }
    const { tenantId: _t, docId, ...updates } = args
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    ) as Record<string, unknown>
    if (filtered.folderId === null) {
      filtered.folderId = undefined
    }
    if (filtered.processingError === null) {
      filtered.processingError = undefined
    }
    await ctx.db.patch(docId, {
      ...filtered,
      updatedAt: Date.now(),
    })
  },
})

export const deleteWorkspaceDocument = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    docId: v.id(TABLES.WORKSPACE_DOCUMENTS),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId)
    if (!doc || doc.tenantId !== args.tenantId) {
      throw new Error('Document not found')
    }
    if (doc.storageId) {
      await ctx.storage.delete(doc.storageId)
    }
    await ctx.db.delete(args.docId)
  },
})

/**
 * One-time migration: copy legacy context docs into workspace_documents.
 * Skips any context doc that already has a workspace row linked via migratedFromContextDocId.
 */
export const migrateContextDocsToWorkspace = mutation({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    const contextDocs = await ctx.db
      .query(TABLES.CONTEXT_DOCS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .collect()

    const imported: Id<'workspaceDocuments'>[] = []

    for (const cd of contextDocs) {
      const existing = await ctx.db
        .query(TABLES.WORKSPACE_DOCUMENTS)
        .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
        .filter((q) => q.eq(q.field('migratedFromContextDocId'), cd._id))
        .first()
      if (existing) continue

      const tags = [`context:${cd.category}`]

      const id = await ctx.db.insert(TABLES.WORKSPACE_DOCUMENTS, {
        tenantId: cd.tenantId,
        userId: cd.userId,
        scope: cd.scope ?? SCOPE.ORG,
        title: cd.title,
        type: WORKSPACE_DOC_TYPE.NOTE,
        extractedText: cd.content,
        tags,
        category: cd.category,
        status: WORKSPACE_DOC_STATUS.READY,
        migratedFromContextDocId: cd._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      imported.push(id)
    }

    return { importedCount: imported.length, importedIds: imported }
  },
})

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getOrgWorkspaceDocuments = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.WORKSPACE_DOCUMENTS)
      .withIndex(INDEXES.BY_TENANT_SCOPE, (q) =>
        q.eq('tenantId', tenantId).eq('scope', SCOPE.ORG)
      )
      .collect()
  },
})

export const getUserWorkspaceDocuments = query({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query(TABLES.WORKSPACE_DOCUMENTS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('scope'), SCOPE.USER))
      .collect()
  },
})

export const getAllWorkspaceDocumentsForChat = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
  },
  handler: async (ctx, { tenantId, userId }) => {
    const [orgDocs, userDocs] = await Promise.all([
      ctx.db
        .query(TABLES.WORKSPACE_DOCUMENTS)
        .withIndex(INDEXES.BY_TENANT_SCOPE, (q) =>
          q.eq('tenantId', tenantId).eq('scope', SCOPE.ORG)
        )
        .collect(),
      ctx.db
        .query(TABLES.WORKSPACE_DOCUMENTS)
        .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
        .filter((q) => q.eq(q.field('scope'), SCOPE.USER))
        .collect(),
    ])
    return [...orgDocs, ...userDocs]
  },
})

export const getWorkspaceDocument = query({
  args: { docId: v.id(TABLES.WORKSPACE_DOCUMENTS) },
  handler: async (ctx, { docId }) => {
    return await ctx.db.get(docId)
  },
})

export const getWorkspaceDocumentsByTenant = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.WORKSPACE_DOCUMENTS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .collect()
  },
})

/** Signed URL for a workspace file (Convex storage). Verifies tenant ownership. */
export const getSignedFileUrlForDocument = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    docId: v.id(TABLES.WORKSPACE_DOCUMENTS),
  },
  handler: async (ctx, { tenantId, docId }) => {
    const doc = await ctx.db.get(docId)
    if (!doc || doc.tenantId !== tenantId || !doc.storageId) {
      return null
    }
    return await ctx.storage.getUrl(doc.storageId)
  },
})
