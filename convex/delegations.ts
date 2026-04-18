import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { AGENT_RUN_STATUS, INDEXES, TABLES } from './constants'

/**
 * Parent->child hop log written by the orchestrator's supervisor hook.
 *
 * One delegation row = one invocation of a sub-agent, regardless of how many
 * tool calls the sub-agent performs internally. The child's full progress
 * lives in runProgress/artifacts keyed by childRunId.
 */

const statusValidator = v.union(
  v.literal(AGENT_RUN_STATUS.PENDING),
  v.literal(AGENT_RUN_STATUS.RUNNING),
  v.literal(AGENT_RUN_STATUS.SUSPENDED),
  v.literal(AGENT_RUN_STATUS.COMPLETED),
  v.literal(AGENT_RUN_STATUS.FAILED),
  v.literal(AGENT_RUN_STATUS.CANCELLED)
)

export const create = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    parentRunId: v.id(TABLES.AGENT_RUNS),
    childRunId: v.id(TABLES.AGENT_RUNS),
    targetAgentId: v.string(),
    input: v.optional(v.any()),
  },
  returns: v.id(TABLES.DELEGATIONS),
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.DELEGATIONS, {
      tenantId: args.tenantId,
      parentRunId: args.parentRunId,
      childRunId: args.childRunId,
      targetAgentId: args.targetAgentId,
      input: args.input,
      status: AGENT_RUN_STATUS.PENDING,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const internalCreate = internalMutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    parentRunId: v.id(TABLES.AGENT_RUNS),
    childRunId: v.id(TABLES.AGENT_RUNS),
    targetAgentId: v.string(),
    input: v.optional(v.any()),
  },
  returns: v.id(TABLES.DELEGATIONS),
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.DELEGATIONS, {
      tenantId: args.tenantId,
      parentRunId: args.parentRunId,
      childRunId: args.childRunId,
      targetAgentId: args.targetAgentId,
      input: args.input,
      status: AGENT_RUN_STATUS.PENDING,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateStatus = mutation({
  args: {
    delegationId: v.id(TABLES.DELEGATIONS),
    status: statusValidator,
    output: v.optional(v.any()),
  },
  returns: v.id(TABLES.DELEGATIONS),
  handler: async (ctx, { delegationId, status, output }) => {
    const patch: Record<string, unknown> = { status, updatedAt: Date.now() }
    if (output !== undefined) patch.output = output
    await ctx.db.patch(delegationId, patch)
    return delegationId
  },
})

export const listForParent = query({
  args: { parentRunId: v.id(TABLES.AGENT_RUNS) },
  handler: async (ctx, { parentRunId }) => {
    return await ctx.db
      .query(TABLES.DELEGATIONS)
      .withIndex(INDEXES.BY_PARENT_CREATED, (q) => q.eq('parentRunId', parentRunId))
      .order('asc')
      .collect()
  },
})
