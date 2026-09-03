import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { DRAFT_STATUS, INDEXES, TABLES } from './constants'

const statusValidator = v.union(
  v.literal(DRAFT_STATUS.PENDING_REVIEW),
  v.literal(DRAFT_STATUS.APPROVED),
  v.literal(DRAFT_STATUS.REJECTED),
  v.literal(DRAFT_STATUS.SENT),
  v.literal(DRAFT_STATUS.FAILED)
)

const draftDocValidator = v.object({
  _id: v.id(TABLES.REPLY_DRAFTS),
  _creationTime: v.number(),
  tenantId: v.id(TABLES.TENANTS),
  threadId: v.id(TABLES.INBOX_THREADS),
  triageId: v.optional(v.id(TABLES.REPLY_TRIAGE)),
  propertyId: v.optional(v.id(TABLES.PROPERTIES)),
  body: v.string(),
  status: statusValidator,
  model: v.string(),
  editedBody: v.optional(v.string()),
  sentAt: v.optional(v.number()),
  sendError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

export const create = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    threadId: v.id(TABLES.INBOX_THREADS),
    triageId: v.optional(v.id(TABLES.REPLY_TRIAGE)),
    propertyId: v.optional(v.id(TABLES.PROPERTIES)),
    body: v.string(),
    status: v.optional(statusValidator),
    model: v.string(),
  },
  returns: v.id(TABLES.REPLY_DRAFTS),
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.REPLY_DRAFTS, {
      tenantId: args.tenantId,
      threadId: args.threadId,
      triageId: args.triageId,
      propertyId: args.propertyId,
      body: args.body,
      status: args.status ?? DRAFT_STATUS.PENDING_REVIEW,
      model: args.model,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const getById = query({
  args: { draftId: v.id(TABLES.REPLY_DRAFTS) },
  returns: v.union(draftDocValidator, v.null()),
  handler: async (ctx, { draftId }) => {
    return await ctx.db.get(draftId)
  },
})

export const updateBody = mutation({
  args: {
    draftId: v.id(TABLES.REPLY_DRAFTS),
    body: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { draftId, body }) => {
    const row = await ctx.db.get(draftId)
    if (!row) throw new Error('Draft not found')
    await ctx.db.patch(draftId, {
      editedBody: body,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const setStatus = mutation({
  args: {
    draftId: v.id(TABLES.REPLY_DRAFTS),
    status: statusValidator,
    sentAt: v.optional(v.number()),
    sendError: v.optional(v.string()),
  },
  returns: v.object({ status: statusValidator }),
  handler: async (ctx, { draftId, status, sentAt, sendError }) => {
    const row = await ctx.db.get(draftId)
    if (!row) throw new Error('Draft not found')
    await ctx.db.patch(draftId, {
      status,
      sentAt,
      sendError,
      updatedAt: Date.now(),
    })
    return { status }
  },
})

export const latestForThread = query({
  args: { threadId: v.id(TABLES.INBOX_THREADS) },
  returns: v.union(draftDocValidator, v.null()),
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query(TABLES.REPLY_DRAFTS)
      .withIndex(INDEXES.BY_THREAD_ID, (q) => q.eq('threadId', threadId))
      .order('desc')
      .first()
  },
})
