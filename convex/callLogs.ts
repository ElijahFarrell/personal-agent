import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  CALL_DIRECTION,
  CALL_LOG_PROVIDER,
  CALL_LOG_STATUS,
  COMPLIANCE_DECISION,
  INDEXES,
  TABLES,
} from './constants'

const providerValidator = v.union(
  v.literal(CALL_LOG_PROVIDER.RETELL),
  v.literal(CALL_LOG_PROVIDER.CALLINGLY),
  v.literal(CALL_LOG_PROVIDER.OTHER)
)

const directionValidator = v.union(
  v.literal(CALL_DIRECTION.INBOUND),
  v.literal(CALL_DIRECTION.OUTBOUND)
)

const statusValidator = v.union(
  v.literal(CALL_LOG_STATUS.INITIATED),
  v.literal(CALL_LOG_STATUS.RINGING),
  v.literal(CALL_LOG_STATUS.IN_PROGRESS),
  v.literal(CALL_LOG_STATUS.ENDED),
  v.literal(CALL_LOG_STATUS.FAILED),
  v.literal(CALL_LOG_STATUS.ANALYZED)
)

const complianceSnapshotValidator = v.optional(
  v.object({
    policyVersion: v.string(),
    decision: v.union(
      v.literal(COMPLIANCE_DECISION.ALLOW),
      v.literal(COMPLIANCE_DECISION.BLOCK)
    ),
    reasonCodes: v.array(v.string()),
  })
)

export const listByTenantId = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    return await ctx.db
      .query(TABLES.CALL_LOGS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(limit)
  },
})

export const listByProspectId = query({
  args: {
    prospectId: v.id(TABLES.PROSPECTS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { prospectId, limit = 30 }) => {
    return await ctx.db
      .query(TABLES.CALL_LOGS)
      .withIndex(INDEXES.BY_PROSPECT_ID, (q) => q.eq('prospectId', prospectId))
      .order('desc')
      .take(limit)
  },
})

export const getByExternalCallId = query({
  args: { externalCallId: v.string() },
  handler: async (ctx, { externalCallId }) => {
    return await ctx.db
      .query(TABLES.CALL_LOGS)
      .withIndex(INDEXES.BY_EXTERNAL_CALL_ID, (q) => q.eq('externalCallId', externalCallId))
      .first()
  },
})

export const create = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    provider: providerValidator,
    externalCallId: v.string(),
    direction: directionValidator,
    durationMs: v.optional(v.number()),
    transcript: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    analysis: v.optional(v.any()),
    status: statusValidator,
    retellAgentId: v.optional(v.string()),
    workflowRunId: v.optional(v.id(TABLES.WORKFLOW_RUNS)),
    complianceSnapshot: complianceSnapshotValidator,
    rawPayload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.CALL_LOGS, {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const upsertFromWebhook = mutation({
  args: {
    webhookSecret: v.string(),
    tenantId: v.id(TABLES.TENANTS),
    provider: providerValidator,
    externalCallId: v.string(),
    direction: directionValidator,
    durationMs: v.optional(v.number()),
    transcript: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    analysis: v.optional(v.any()),
    status: statusValidator,
    retellAgentId: v.optional(v.string()),
    rawPayload: v.optional(v.any()),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    complianceSnapshot: complianceSnapshotValidator,
  },
  handler: async (ctx, args) => {
    const expected = process.env.INTERNAL_WEBHOOK_SECRET
    if (!expected || args.webhookSecret !== expected) {
      throw new Error('Unauthorized')
    }
    const { webhookSecret: _, ...rest } = args
    const now = Date.now()
    const existing = await ctx.db
      .query(TABLES.CALL_LOGS)
      .withIndex(INDEXES.BY_EXTERNAL_CALL_ID, (q) =>
        q.eq('externalCallId', rest.externalCallId)
      )
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...rest,
        updatedAt: now,
      })
      return existing._id
    }
    return await ctx.db.insert(TABLES.CALL_LOGS, {
      ...rest,
      createdAt: now,
      updatedAt: now,
    })
  },
})
