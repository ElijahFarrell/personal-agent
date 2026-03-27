import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, MARKETING_METRIC_SOURCE, TABLES } from './constants'

const sourceValidator = v.union(
  v.literal(MARKETING_METRIC_SOURCE.LEMLIST),
  v.literal(MARKETING_METRIC_SOURCE.APOLLO),
  v.literal(MARKETING_METRIC_SOURCE.MAILCHIMP)
)

const metricsValidator = v.object({
  sent: v.optional(v.number()),
  replied: v.optional(v.number()),
  opened: v.optional(v.number()),
  bounced: v.optional(v.number()),
  clicked: v.optional(v.number()),
})

const snapshotRowValidator = v.object({
  externalId: v.string(),
  label: v.string(),
  periodStart: v.number(),
  periodEnd: v.number(),
  metrics: metricsValidator,
  rawPayload: v.optional(v.any()),
})

export const listForUser = query({
  args: {
    userId: v.id(TABLES.USERS),
    source: v.optional(sourceValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, source, limit = 200 }) => {
    const rows = await ctx.db
      .query(TABLES.MARKETING_CAMPAIGN_METRICS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .collect()

    let filtered = source ? rows.filter((r) => r.source === source) : rows
    filtered.sort((a, b) => b.syncedAt - a.syncedAt)
    return filtered.slice(0, limit)
  },
})

export const replaceSnapshotsForSource = mutation({
  args: {
    clerkUserId: v.string(),
    tenantId: v.id(TABLES.TENANTS),
    source: sourceValidator,
    rows: v.array(snapshotRowValidator),
  },
  handler: async (ctx, { clerkUserId, tenantId, source, rows }) => {
    const user = await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_CLERK_USER_ID, (q) => q.eq('clerkUserId', clerkUserId))
      .unique()

    if (!user || user.tenantId !== tenantId) {
      throw new Error('Unauthorized')
    }

    const existing = await ctx.db
      .query(TABLES.MARKETING_CAMPAIGN_METRICS)
      .withIndex(INDEXES.BY_MARKETING_USER_SOURCE, (q) =>
        q.eq('userId', user._id).eq('source', source)
      )
      .collect()

    for (const row of existing) {
      await ctx.db.delete(row._id)
    }

    const syncedAt = Date.now()
    for (const row of rows) {
      await ctx.db.insert(TABLES.MARKETING_CAMPAIGN_METRICS, {
        tenantId,
        userId: user._id,
        source,
        externalId: row.externalId,
        label: row.label,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        metrics: row.metrics,
        syncedAt,
        rawPayload: row.rawPayload,
      })
    }

    return { inserted: rows.length, syncedAt }
  },
})
