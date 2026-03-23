import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, MEDIA_ASSET_STATUS, TABLES, VIDEO_JOB_STATUS } from './constants'

export const createJob = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    provider: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.VIDEO_GENERATION_JOBS, {
      tenantId: args.tenantId,
      userId: args.userId,
      status: VIDEO_JOB_STATUS.QUEUED,
      provider: args.provider,
      prompt: args.prompt,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateJobStatus = mutation({
  args: {
    jobId: v.id(TABLES.VIDEO_GENERATION_JOBS),
    status: v.union(
      v.literal(VIDEO_JOB_STATUS.QUEUED),
      v.literal(VIDEO_JOB_STATUS.RUNNING),
      v.literal(VIDEO_JOB_STATUS.COMPLETED),
      v.literal(VIDEO_JOB_STATUS.FAILED)
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, status, error }) => {
    await ctx.db.patch(jobId, {
      status,
      error,
      updatedAt: Date.now(),
    })
  },
})

export const createMediaAsset = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    jobId: v.optional(v.id(TABLES.VIDEO_GENERATION_JOBS)),
    platformIntent: v.string(),
    videoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    status: v.union(
      v.literal(MEDIA_ASSET_STATUS.DRAFT),
      v.literal(MEDIA_ASSET_STATUS.READY),
      v.literal(MEDIA_ASSET_STATUS.POSTING),
      v.literal(MEDIA_ASSET_STATUS.POSTED),
      v.literal(MEDIA_ASSET_STATUS.FAILED)
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.MEDIA_ASSETS, {
      tenantId: args.tenantId,
      userId: args.userId,
      jobId: args.jobId,
      platformIntent: args.platformIntent,
      videoUrl: args.videoUrl,
      thumbnailUrl: args.thumbnailUrl,
      durationSec: args.durationSec,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const listMediaByTenant = query({
  args: { tenantId: v.id(TABLES.TENANTS), limit: v.optional(v.number()) },
  handler: async (ctx, { tenantId, limit = 40 }) => {
    return await ctx.db
      .query(TABLES.MEDIA_ASSETS)
      .withIndex(INDEXES.BY_MEDIA_TENANT_CREATED, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(limit)
  },
})

export const listJobsByUser = query({
  args: { userId: v.id(TABLES.USERS), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit = 20 }) => {
    return await ctx.db
      .query(TABLES.VIDEO_GENERATION_JOBS)
      .withIndex(INDEXES.BY_VIDEO_JOB_USER_CREATED, (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit)
  },
})
