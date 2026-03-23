import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, SCHEDULE_ACTION_TYPE, TABLES } from './constants'

const actionValidator = v.object({
  type: v.union(
    v.literal(SCHEDULE_ACTION_TYPE.WORKFLOW),
    v.literal(SCHEDULE_ACTION_TYPE.AGENT_PROMPT)
  ),
  workflowId: v.optional(v.id(TABLES.WORKFLOW_DEFINITIONS)),
  agentPrompt: v.optional(v.string()),
})

export const listByUserId = query({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query(TABLES.AUTOMATION_TRIGGERS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})

export const getByComposioTriggerId = query({
  args: { composioTriggerId: v.string() },
  handler: async (ctx, { composioTriggerId }) => {
    return await ctx.db
      .query(TABLES.AUTOMATION_TRIGGERS)
      .withIndex(INDEXES.BY_COMPOSIO_TRIGGER_ID, (q) =>
        q.eq('composioTriggerId', composioTriggerId)
      )
      .unique()
  },
})

export const create = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    composioTriggerId: v.string(),
    toolkit: v.string(),
    triggerSlug: v.string(),
    config: v.optional(v.any()),
    isEnabled: v.boolean(),
    action: actionValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.AUTOMATION_TRIGGERS, {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const setEnabled = mutation({
  args: {
    id: v.id(TABLES.AUTOMATION_TRIGGERS),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, { id, isEnabled }) => {
    await ctx.db.patch(id, { isEnabled, updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { id: v.id(TABLES.AUTOMATION_TRIGGERS) },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})
