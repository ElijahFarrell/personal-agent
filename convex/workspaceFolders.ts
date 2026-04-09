import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { INDEXES, SCOPE, TABLES } from './constants'

const scopeValidator = v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER))

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

export const createWorkspaceFolder = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    scope: scopeValidator,
    name: v.string(),
    parentId: v.optional(v.id(TABLES.WORKSPACE_FOLDERS)),
  },
  handler: async (ctx, args) => {
    await assertUserBelongsToTenant(ctx, args.userId, args.tenantId)
    return await ctx.db.insert(TABLES.WORKSPACE_FOLDERS, {
      tenantId: args.tenantId,
      userId: args.userId,
      name: args.name,
      parentId: args.parentId,
      scope: args.scope,
      createdAt: Date.now(),
    })
  },
})

export const renameWorkspaceFolder = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    folderId: v.id(TABLES.WORKSPACE_FOLDERS),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId)
    if (!folder || folder.tenantId !== args.tenantId) {
      throw new Error('Folder not found')
    }
    await ctx.db.patch(args.folderId, { name: args.name })
  },
})

export const deleteWorkspaceFolder = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    folderId: v.id(TABLES.WORKSPACE_FOLDERS),
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId)
    if (!folder || folder.tenantId !== args.tenantId) {
      throw new Error('Folder not found')
    }
    const children = await ctx.db
      .query(TABLES.WORKSPACE_FOLDERS)
      .withIndex(INDEXES.BY_WORKSPACE_FOLDER_ID, (q) => q.eq('parentId', args.folderId))
      .collect()
    if (children.length > 0) {
      throw new Error('Folder must be empty (no subfolders)')
    }
    const docs = await ctx.db
      .query(TABLES.WORKSPACE_DOCUMENTS)
      .withIndex(INDEXES.BY_WORKSPACE_FOLDER_ID, (q) => q.eq('folderId', args.folderId))
      .collect()
    if (docs.length > 0) {
      throw new Error('Folder must be empty (move documents first)')
    }
    await ctx.db.delete(args.folderId)
  },
})

export const listWorkspaceFolders = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.WORKSPACE_FOLDERS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .collect()
  },
})
