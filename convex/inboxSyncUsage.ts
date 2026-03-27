import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

function utcDateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

export const getCountForUserToday = query({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    const dateKey = utcDateKey(Date.now())
    const row = await ctx.db
      .query(TABLES.INBOX_SYNC_USAGE)
      .withIndex(INDEXES.BY_INBOX_SYNC_USER_DATE, (q) =>
        q.eq('userId', userId).eq('dateKey', dateKey)
      )
      .unique()
    return row?.syncCount ?? 0
  },
})

/**
 * Increments today's sync count for the user. Returns new total for the day.
 */
export const incrementSyncCount = mutation({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    const now = Date.now()
    const dateKey = utcDateKey(now)
    const existing = await ctx.db
      .query(TABLES.INBOX_SYNC_USAGE)
      .withIndex(INDEXES.BY_INBOX_SYNC_USER_DATE, (q) =>
        q.eq('userId', userId).eq('dateKey', dateKey)
      )
      .unique()

    if (existing) {
      const syncCount = existing.syncCount + 1
      await ctx.db.patch(existing._id, { syncCount, updatedAt: now })
      return syncCount
    }

    await ctx.db.insert(TABLES.INBOX_SYNC_USAGE, {
      userId,
      dateKey,
      syncCount: 1,
      updatedAt: now,
    })
    return 1
  },
})
