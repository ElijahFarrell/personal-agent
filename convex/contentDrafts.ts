import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  CONTENT_DRAFT_STATUS,
  CONTENT_PLATFORM,
  INDEXES,
  SCOPE,
  TABLES,
} from './constants'

const platformValidator = v.union(
  v.literal(CONTENT_PLATFORM.LINKEDIN),
  v.literal(CONTENT_PLATFORM.X),
  v.literal(CONTENT_PLATFORM.YOUTUBE),
  v.literal(CONTENT_PLATFORM.INSTAGRAM),
  v.literal(CONTENT_PLATFORM.TIKTOK)
)

const scopeValidator = v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER))

const statusValidator = v.union(
  v.literal(CONTENT_DRAFT_STATUS.DRAFT),
  v.literal(CONTENT_DRAFT_STATUS.READY),
  v.literal(CONTENT_DRAFT_STATUS.POSTED),
  v.literal(CONTENT_DRAFT_STATUS.SCHEDULED)
)

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createContentDraft = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    scope: scopeValidator,
    platform: platformValidator,
    content: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.CONTENT_DRAFTS, {
      ...args,
      status: CONTENT_DRAFT_STATUS.DRAFT,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateContentDraft = mutation({
  args: {
    draftId: v.id(TABLES.CONTENT_DRAFTS),
    content: v.optional(v.string()),
    title: v.optional(v.string()),
    platform: v.optional(platformValidator),
  },
  handler: async (ctx, args) => {
    const { draftId, ...updates } = args
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )
    await ctx.db.patch(draftId, { ...filtered, updatedAt: Date.now() })
  },
})

export const updateContentDraftStatus = mutation({
  args: {
    draftId: v.id(TABLES.CONTENT_DRAFTS),
    status: statusValidator,
    postedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { draftId, status, postedAt } = args
    const updates: Record<string, unknown> = { status, updatedAt: Date.now() }
    if (postedAt !== undefined) updates.postedAt = postedAt
    await ctx.db.patch(draftId, updates)
  },
})

export const deleteContentDraft = mutation({
  args: {
    draftId: v.id(TABLES.CONTENT_DRAFTS),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.draftId)
  },
})

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getOrgContentDrafts = query({
  args: { tenantId: v.id(TABLES.TENANTS), platform: v.optional(platformValidator) },
  handler: async (ctx, { tenantId, platform }) => {
    const docs = await ctx.db
      .query(TABLES.CONTENT_DRAFTS)
      .withIndex(INDEXES.BY_TENANT_SCOPE, (q) =>
        q.eq('tenantId', tenantId).eq('scope', SCOPE.ORG)
      )
      .collect()
    if (platform) return docs.filter((d) => d.platform === platform)
    return docs
  },
})

export const getUserContentDrafts = query({
  args: { userId: v.id(TABLES.USERS), platform: v.optional(platformValidator) },
  handler: async (ctx, { userId, platform }) => {
    const docs = await ctx.db
      .query(TABLES.CONTENT_DRAFTS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .collect()
    const userScoped = docs.filter((d) => d.scope === SCOPE.USER)
    if (platform) return userScoped.filter((d) => d.platform === platform)
    return userScoped
  },
})

export const getContentDraftById = query({
  args: { draftId: v.id(TABLES.CONTENT_DRAFTS) },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.draftId)
  },
})
