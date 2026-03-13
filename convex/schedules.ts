import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  INDEXES,
  SCHEDULE_ACTION_TYPE,
  SCHEDULE_LOG_STATUS,
  TABLES,
} from './constants'

// ─── Validators ──────────────────────────────────────────────────────────────

const actionValidator = v.object({
  type: v.union(
    v.literal(SCHEDULE_ACTION_TYPE.WORKFLOW),
    v.literal(SCHEDULE_ACTION_TYPE.AGENT_PROMPT)
  ),
  workflowId: v.optional(v.id(TABLES.WORKFLOW_DEFINITIONS)),
  agentPrompt: v.optional(v.string()),
  inputData: v.optional(v.any()),
})

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listByTenantId = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.SCHEDULES)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .collect()
  },
})

export const listByUserId = query({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query(TABLES.SCHEDULES)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})

export const getDueSchedules = query({
  args: { beforeTimestamp: v.number() },
  handler: async (ctx, { beforeTimestamp }) => {
    return await ctx.db
      .query(TABLES.SCHEDULES)
      .withIndex(INDEXES.BY_NEXT_RUN_AT, (q) => q.lte('nextRunAt', beforeTimestamp))
      .filter((q) => q.eq(q.field('isEnabled'), true))
      .collect()
  },
})

export const getById = query({
  args: { scheduleId: v.id(TABLES.SCHEDULES) },
  handler: async (ctx, { scheduleId }) => {
    return await ctx.db.get(scheduleId)
  },
})

export const getLogsByScheduleId = query({
  args: {
    scheduleId: v.id(TABLES.SCHEDULES),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { scheduleId, limit = 20 }) => {
    return await ctx.db
      .query(TABLES.SCHEDULE_LOGS)
      .withIndex(INDEXES.BY_SCHEDULE_ID, (q) => q.eq('scheduleId', scheduleId))
      .order('desc')
      .take(limit)
  },
})

// ─── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    name: v.string(),
    description: v.optional(v.string()),
    cronExpression: v.string(),
    timezone: v.string(),
    action: actionValidator,
    isEnabled: v.boolean(),
    autoApprove: v.boolean(),
    nextRunAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const scheduleId = await ctx.db.insert(TABLES.SCHEDULES, {
      tenantId: args.tenantId,
      userId: args.userId,
      name: args.name,
      description: args.description,
      cronExpression: args.cronExpression,
      timezone: args.timezone,
      action: args.action,
      isEnabled: args.isEnabled,
      autoApprove: args.autoApprove,
      nextRunAt: args.nextRunAt,
      createdAt: now,
      updatedAt: now,
    })
    return scheduleId
  },
})

export const update = mutation({
  args: {
    scheduleId: v.id(TABLES.SCHEDULES),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    cronExpression: v.optional(v.string()),
    timezone: v.optional(v.string()),
    action: v.optional(actionValidator),
    isEnabled: v.optional(v.boolean()),
    autoApprove: v.optional(v.boolean()),
    nextRunAt: v.optional(v.number()),
    lastRunAt: v.optional(v.number()),
    lastRunStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { scheduleId, ...updates } = args
    const existing = await ctx.db.get(scheduleId)
    if (!existing) throw new Error('Schedule not found')

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>
    if (Object.keys(filtered).length === 0) return scheduleId

    await ctx.db.patch(scheduleId, {
      ...filtered,
      updatedAt: Date.now(),
    } as Record<string, unknown>)
    return scheduleId
  },
})

export const toggleEnabled = mutation({
  args: {
    scheduleId: v.id(TABLES.SCHEDULES),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, { scheduleId, isEnabled }) => {
    const existing = await ctx.db.get(scheduleId)
    if (!existing) throw new Error('Schedule not found')
    await ctx.db.patch(scheduleId, {
      isEnabled,
      updatedAt: Date.now(),
    })
    return scheduleId
  },
})

export const remove = mutation({
  args: { scheduleId: v.id(TABLES.SCHEDULES) },
  handler: async (ctx, { scheduleId }) => {
    const existing = await ctx.db.get(scheduleId)
    if (!existing) throw new Error('Schedule not found')
    await ctx.db.delete(scheduleId)
    return scheduleId
  },
})

export const addLog = mutation({
  args: {
    scheduleId: v.id(TABLES.SCHEDULES),
    tenantId: v.id(TABLES.TENANTS),
    runId: v.optional(v.string()),
    status: v.union(
      v.literal(SCHEDULE_LOG_STATUS.RUNNING),
      v.literal(SCHEDULE_LOG_STATUS.SUCCESS),
      v.literal(SCHEDULE_LOG_STATUS.FAILED),
      v.literal(SCHEDULE_LOG_STATUS.SUSPENDED)
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert(TABLES.SCHEDULE_LOGS, args)
  },
})

export const updateAfterRun = mutation({
  args: {
    scheduleId: v.id(TABLES.SCHEDULES),
    lastRunAt: v.number(),
    lastRunStatus: v.string(),
    nextRunAt: v.number(),
  },
  handler: async (ctx, { scheduleId, lastRunAt, lastRunStatus, nextRunAt }) => {
    const existing = await ctx.db.get(scheduleId)
    if (!existing) throw new Error('Schedule not found')
    await ctx.db.patch(scheduleId, {
      lastRunAt,
      lastRunStatus,
      nextRunAt,
      updatedAt: Date.now(),
    })
    return scheduleId
  },
})
