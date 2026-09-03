import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, REPLY_TAG, TABLES, TRIAGE_STATUS } from './constants'

const tagValidator = v.union(
  v.literal(REPLY_TAG.IGNORE),
  v.literal(REPLY_TAG.LATER),
  v.literal(REPLY_TAG.HUMAN_NOW),
  v.literal(REPLY_TAG.DEAL)
)

const statusValidator = v.union(
  v.literal(TRIAGE_STATUS.OPEN),
  v.literal(TRIAGE_STATUS.HANDLED),
  v.literal(TRIAGE_STATUS.SNOOZED)
)

const extractedValidator = v.object({
  askingPrice: v.optional(v.number()),
  timeline: v.optional(v.string()),
  motivation: v.optional(v.string()),
  wantsCall: v.optional(v.boolean()),
  acreageConfirmed: v.optional(v.boolean()),
  notes: v.optional(v.string()),
})

const triageDocValidator = v.object({
  _id: v.id(TABLES.REPLY_TRIAGE),
  _creationTime: v.number(),
  tenantId: v.id(TABLES.TENANTS),
  threadId: v.id(TABLES.INBOX_THREADS),
  prospectId: v.optional(v.id(TABLES.PROSPECTS)),
  propertyId: v.optional(v.id(TABLES.PROPERTIES)),
  tag: tagValidator,
  confidence: v.number(),
  reason: v.string(),
  extracted: extractedValidator,
  status: statusValidator,
  snoozedUntil: v.optional(v.number()),
  lastInboundMessageId: v.string(),
  classifiedAt: v.number(),
  model: v.string(),
  updatedAt: v.number(),
})

function clampConfidence(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export const upsertForThread = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    threadId: v.id(TABLES.INBOX_THREADS),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    propertyId: v.optional(v.id(TABLES.PROPERTIES)),
    tag: tagValidator,
    confidence: v.number(),
    reason: v.string(),
    extracted: extractedValidator,
    status: v.optional(statusValidator),
    snoozedUntil: v.optional(v.number()),
    lastInboundMessageId: v.string(),
    model: v.string(),
  },
  returns: v.id(TABLES.REPLY_TRIAGE),
  handler: async (ctx, args) => {
    const now = Date.now()
    const confidence = clampConfidence(args.confidence)
    const existing = await ctx.db
      .query(TABLES.REPLY_TRIAGE)
      .withIndex(INDEXES.BY_THREAD_ID, (q) => q.eq('threadId', args.threadId))
      .first()

    const fields = {
      prospectId: args.prospectId,
      propertyId: args.propertyId,
      tag: args.tag,
      confidence,
      reason: args.reason,
      extracted: args.extracted,
      status: args.status ?? TRIAGE_STATUS.OPEN,
      snoozedUntil: args.snoozedUntil,
      lastInboundMessageId: args.lastInboundMessageId,
      classifiedAt: now,
      model: args.model,
      updatedAt: now,
    }

    if (existing && existing.tenantId === args.tenantId) {
      await ctx.db.patch(existing._id, fields)
      return existing._id
    }

    return await ctx.db.insert(TABLES.REPLY_TRIAGE, {
      tenantId: args.tenantId,
      threadId: args.threadId,
      ...fields,
    })
  },
})

export const getByThread = query({
  args: { threadId: v.id(TABLES.INBOX_THREADS) },
  returns: v.union(triageDocValidator, v.null()),
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query(TABLES.REPLY_TRIAGE)
      .withIndex(INDEXES.BY_THREAD_ID, (q) => q.eq('threadId', threadId))
      .first()
  },
})

export const getById = query({
  args: { triageId: v.id(TABLES.REPLY_TRIAGE) },
  returns: v.union(triageDocValidator, v.null()),
  handler: async (ctx, { triageId }) => {
    return await ctx.db.get(triageId)
  },
})

export const listQueue = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    status: statusValidator,
    tags: v.array(tagValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(triageDocValidator),
  handler: async (ctx, { tenantId, status, tags, limit = 20 }) => {
    const cap = Math.min(Math.max(limit, 1), 100)
    const tagSet = new Set(tags)
    const rows = await ctx.db
      .query(TABLES.REPLY_TRIAGE)
      .withIndex(INDEXES.BY_TENANT_CLASSIFIED_AT, (q) =>
        q.eq('tenantId', tenantId)
      )
      .order('desc')
      .take(Math.max(cap * 4, 80))

    return rows
      .filter((row) => row.status === status && (tagSet.size === 0 || tagSet.has(row.tag)))
      .slice(0, cap)
  },
})

export const setStatus = mutation({
  args: {
    triageId: v.id(TABLES.REPLY_TRIAGE),
    status: statusValidator,
    snoozedUntil: v.optional(v.number()),
  },
  returns: v.object({ status: statusValidator }),
  handler: async (ctx, { triageId, status, snoozedUntil }) => {
    const row = await ctx.db.get(triageId)
    if (!row) throw new Error('Triage not found')
    await ctx.db.patch(triageId, {
      status,
      snoozedUntil:
        status === TRIAGE_STATUS.SNOOZED ? snoozedUntil : undefined,
      updatedAt: Date.now(),
    })
    return { status }
  },
})
