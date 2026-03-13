import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  INDEXES,
  TABLES,
  WORKFLOW_RUN_STATUS,
  WORKFLOW_STEP_STATUS,
} from './constants'

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listByWorkflowDefinitionId = query({
  args: {
    workflowDefinitionId: v.id(TABLES.WORKFLOW_DEFINITIONS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workflowDefinitionId, limit = 20 }) => {
    return await ctx.db
      .query(TABLES.WORKFLOW_RUNS)
      .withIndex(INDEXES.BY_WORKFLOW_DEFINITION_ID, (q) =>
        q.eq('workflowDefinitionId', workflowDefinitionId)
      )
      .order('desc')
      .take(limit)
  },
})

export const listByTenantId = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 20 }) => {
    return await ctx.db
      .query(TABLES.WORKFLOW_RUNS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(limit)
  },
})

export const getById = query({
  args: { runId: v.id(TABLES.WORKFLOW_RUNS) },
  handler: async (ctx, { runId }) => {
    return await ctx.db.get(runId)
  },
})

export const getStepsByRunId = query({
  args: { runId: v.id(TABLES.WORKFLOW_RUNS) },
  handler: async (ctx, { runId }) => {
    return await ctx.db
      .query(TABLES.WORKFLOW_RUN_STEPS)
      .withIndex(INDEXES.BY_RUN_ID, (q) => q.eq('runId', runId))
      .collect()
  },
})

// ─── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    workflowDefinitionId: v.id(TABLES.WORKFLOW_DEFINITIONS),
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    inputData: v.optional(v.any()),
    autoApprove: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.WORKFLOW_RUNS, {
      workflowDefinitionId: args.workflowDefinitionId,
      tenantId: args.tenantId,
      userId: args.userId,
      status: WORKFLOW_RUN_STATUS.PENDING,
      inputData: args.inputData,
      autoApprove: args.autoApprove,
      startedAt: now,
    })
  },
})

export const updateStatus = mutation({
  args: {
    runId: v.id(TABLES.WORKFLOW_RUNS),
    status: v.union(
      v.literal(WORKFLOW_RUN_STATUS.RUNNING),
      v.literal(WORKFLOW_RUN_STATUS.SUSPENDED),
      v.literal(WORKFLOW_RUN_STATUS.SUCCESS),
      v.literal(WORKFLOW_RUN_STATUS.FAILED)
    ),
    mastraRunId: v.optional(v.string()),
    result: v.optional(v.any()),
    suspendedAt: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { runId, ...updates } = args
    const existing = await ctx.db.get(runId)
    if (!existing) throw new Error('Workflow run not found')

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>
    if (Object.keys(filtered).length === 0) return runId

    await ctx.db.patch(runId, filtered as Record<string, unknown>)
    return runId
  },
})

export const addStep = mutation({
  args: {
    runId: v.id(TABLES.WORKFLOW_RUNS),
    stepId: v.string(),
    status: v.union(
      v.literal(WORKFLOW_STEP_STATUS.PENDING),
      v.literal(WORKFLOW_STEP_STATUS.RUNNING),
      v.literal(WORKFLOW_STEP_STATUS.SUCCESS),
      v.literal(WORKFLOW_STEP_STATUS.FAILED),
      v.literal(WORKFLOW_STEP_STATUS.SUSPENDED)
    ),
    inputData: v.optional(v.any()),
    outputData: v.optional(v.any()),
    suspendPayload: v.optional(v.any()),
    resumeData: v.optional(v.any()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert(TABLES.WORKFLOW_RUN_STEPS, args)
  },
})

export const updateStep = mutation({
  args: {
    runId: v.id(TABLES.WORKFLOW_RUNS),
    stepId: v.string(),
    status: v.optional(
      v.union(
        v.literal(WORKFLOW_STEP_STATUS.RUNNING),
        v.literal(WORKFLOW_STEP_STATUS.SUCCESS),
        v.literal(WORKFLOW_STEP_STATUS.FAILED),
        v.literal(WORKFLOW_STEP_STATUS.SUSPENDED)
      )
    ),
    outputData: v.optional(v.any()),
    suspendPayload: v.optional(v.any()),
    resumeData: v.optional(v.any()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { runId, stepId, ...updates } = args
    const steps = await ctx.db
      .query(TABLES.WORKFLOW_RUN_STEPS)
      .withIndex(INDEXES.BY_RUN_ID, (q) => q.eq('runId', runId))
      .collect()

    const step = steps.find((s) => s.stepId === stepId)
    if (!step) throw new Error('Step not found')

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>
    if (Object.keys(filtered).length === 0) return step._id

    await ctx.db.patch(step._id, filtered as Record<string, unknown>)
    return step._id
  },
})
