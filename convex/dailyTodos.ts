import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

const todoItemValidator = v.object({
  id: v.string(),
  text: v.string(),
  completed: v.boolean(),
  order: v.number(),
  source: v.optional(v.string()),
})

export const getByUserAndDate = query({
  args: {
    userId: v.id(TABLES.USERS),
    date: v.string(),
  },
  handler: async (ctx, { userId, date }) => {
    return await ctx.db
      .query(TABLES.DAILY_TODOS)
      .withIndex(INDEXES.BY_USER_ID_DATE, (q) =>
        q.eq('userId', userId).eq('date', date)
      )
      .unique()
  },
})

export const upsertItems = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    date: v.string(),
    items: v.array(todoItemValidator),
  },
  handler: async (ctx, { userId, date, items }) => {
    const now = Date.now()
    const existing = await ctx.db
      .query(TABLES.DAILY_TODOS)
      .withIndex(INDEXES.BY_USER_ID_DATE, (q) =>
        q.eq('userId', userId).eq('date', date)
      )
      .unique()

    const doc = { userId, date, items, updatedAt: now }

    if (existing) {
      await ctx.db.patch(existing._id, doc)
      return existing._id
    }

    return await ctx.db.insert(TABLES.DAILY_TODOS, doc)
  },
})

export const toggleItem = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    date: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, { userId, date, itemId }) => {
    const existing = await ctx.db
      .query(TABLES.DAILY_TODOS)
      .withIndex(INDEXES.BY_USER_ID_DATE, (q) =>
        q.eq('userId', userId).eq('date', date)
      )
      .unique()

    if (!existing) return null

    const items = existing.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )

    await ctx.db.patch(existing._id, {
      items,
      updatedAt: Date.now(),
    })
    return existing._id
  },
})

export const addItem = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    date: v.string(),
    text: v.string(),
  },
  handler: async (ctx, { userId, date, text }) => {
    const now = Date.now()
    const existing = await ctx.db
      .query(TABLES.DAILY_TODOS)
      .withIndex(INDEXES.BY_USER_ID_DATE, (q) =>
        q.eq('userId', userId).eq('date', date)
      )
      .unique()

    const newItem = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      order: existing ? existing.items.length : 0,
    }

    if (existing) {
      const items = [...existing.items, newItem]
      await ctx.db.patch(existing._id, { items, updatedAt: now })
      return existing._id
    }

    return await ctx.db.insert(TABLES.DAILY_TODOS, {
      userId,
      date,
      items: [newItem],
      updatedAt: now,
    })
  },
})

export const removeItem = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    date: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, { userId, date, itemId }) => {
    const existing = await ctx.db
      .query(TABLES.DAILY_TODOS)
      .withIndex(INDEXES.BY_USER_ID_DATE, (q) =>
        q.eq('userId', userId).eq('date', date)
      )
      .unique()

    if (!existing) return null

    const items = existing.items
      .filter((item) => item.id !== itemId)
      .map((item, i) => ({ ...item, order: i }))

    await ctx.db.patch(existing._id, {
      items,
      updatedAt: Date.now(),
    })
    return existing._id
  },
})
