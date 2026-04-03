import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  CALL_DIRECTION,
  COMPLIANCE_DECISION,
  INDEXES,
  SMS_LOG_PROVIDER,
  SMS_LOG_STATUS,
  TABLES,
} from './constants'

const providerValidator = v.union(
  v.literal(SMS_LOG_PROVIDER.SMS_ALERT),
  v.literal(SMS_LOG_PROVIDER.TWILIO),
  v.literal(SMS_LOG_PROVIDER.TELNYX),
  v.literal(SMS_LOG_PROVIDER.OTHER)
)

const directionValidator = v.union(
  v.literal(CALL_DIRECTION.INBOUND),
  v.literal(CALL_DIRECTION.OUTBOUND)
)

const statusValidator = v.union(
  v.literal(SMS_LOG_STATUS.QUEUED),
  v.literal(SMS_LOG_STATUS.SENT),
  v.literal(SMS_LOG_STATUS.DELIVERED),
  v.literal(SMS_LOG_STATUS.FAILED),
  v.literal(SMS_LOG_STATUS.RECEIVED),
  v.literal(SMS_LOG_STATUS.REPLIED)
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
      .query(TABLES.SMS_LOGS)
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
      .query(TABLES.SMS_LOGS)
      .withIndex(INDEXES.BY_PROSPECT_ID, (q) => q.eq('prospectId', prospectId))
      .order('desc')
      .take(limit)
  },
})

export const create = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    provider: providerValidator,
    externalMessageId: v.optional(v.string()),
    direction: directionValidator,
    body: v.string(),
    status: statusValidator,
    replyBody: v.optional(v.string()),
    workflowRunId: v.optional(v.id(TABLES.WORKFLOW_RUNS)),
    complianceSnapshot: complianceSnapshotValidator,
    rawPayload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.SMS_LOGS, {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const createFromWebhook = mutation({
  args: {
    webhookSecret: v.string(),
    tenantId: v.id(TABLES.TENANTS),
    provider: providerValidator,
    externalMessageId: v.optional(v.string()),
    direction: directionValidator,
    body: v.string(),
    status: statusValidator,
    replyBody: v.optional(v.string()),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    complianceSnapshot: complianceSnapshotValidator,
    rawPayload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.INTERNAL_WEBHOOK_SECRET
    if (!expected || args.webhookSecret !== expected) {
      throw new Error('Unauthorized')
    }
    const { webhookSecret: _, ...rest } = args
    const now = Date.now()
    return await ctx.db.insert(TABLES.SMS_LOGS, {
      ...rest,
      createdAt: now,
      updatedAt: now,
    })
  },
})
