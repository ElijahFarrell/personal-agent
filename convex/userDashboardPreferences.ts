import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

const DEFAULT_WIDGETS = ['todo_checklist', 'stats', 'workflow_runs'] as const

export const getByUserId = query({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query(TABLES.USER_DASHBOARD_PREFERENCES)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .unique()
  },
})

export const updatePreferences = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    enabledWidgets: v.array(v.string()),
    widgetOrder: v.optional(v.array(v.number())),
  },
  handler: async (ctx, { userId, enabledWidgets, widgetOrder }) => {
    const now = Date.now()
    const existing = await ctx.db
      .query(TABLES.USER_DASHBOARD_PREFERENCES)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .unique()

    const doc = {
      userId,
      enabledWidgets,
      widgetOrder,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, doc)
      return existing._id
    }

    return await ctx.db.insert(TABLES.USER_DASHBOARD_PREFERENCES, doc)
  },
})

export { DEFAULT_WIDGETS }
