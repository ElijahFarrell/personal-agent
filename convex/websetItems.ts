import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

/**
 * Cached Exa webset items, keyed by tenant + websetId. Populated by the
 * hourly `pullPastWebsets` internal action (see `convex/agentWorkers.ts`)
 * and read by orchestrator tools that want to surface past search results
 * without re-hitting Exa on every turn.
 */

const itemFields = {
  tenantId: v.id(TABLES.TENANTS),
  websetId: v.string(),
  sourceRunId: v.optional(v.id(TABLES.AGENT_RUNS)),
  itemKey: v.string(),
  companyName: v.string(),
  email: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  domain: v.optional(v.string()),
  websetTitle: v.optional(v.string()),
}

/**
 * Insert or update a webset item (tenant + websetId + itemKey is unique).
 * The Exa worker calls this for every company it observes.
 */
export const upsert = internalMutation({
  args: itemFields,
  returns: v.id(TABLES.WEBSET_ITEMS),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query(TABLES.WEBSET_ITEMS)
      .withIndex(INDEXES.BY_TENANT_WEBSET, (q) =>
        q.eq('tenantId', args.tenantId).eq('websetId', args.websetId)
      )
      .filter((q) => q.eq(q.field('itemKey'), args.itemKey))
      .first()

    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        companyName: args.companyName,
        email: args.email ?? existing.email,
        linkedinUrl: args.linkedinUrl ?? existing.linkedinUrl,
        domain: args.domain ?? existing.domain,
        websetTitle: args.websetTitle ?? existing.websetTitle,
        sourceRunId: args.sourceRunId ?? existing.sourceRunId,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert(TABLES.WEBSET_ITEMS, {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * List the most recent websets for a tenant with item counts and a preview.
 * Used by the `list-recent-websets` orchestrator tool.
 *
 * Optional `sinceMs` filter: only websets with at least one item updated at
 * or after that epoch ms are returned. Lets callers answer "websets from
 * today/yesterday" without loading the whole history.
 */
export const listRecent = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    limit: v.optional(v.number()),
    sinceMs: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit, sinceMs }) => {
    const take = Math.min(Math.max(limit ?? 10, 1), 50)

    const rows = await ctx.db
      .query(TABLES.WEBSET_ITEMS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(500)

    const grouped = new Map<
      string,
      {
        websetId: string
        websetTitle?: string
        sourceRunId?: string
        count: number
        newestAt: number
        preview: Array<{ companyName: string; domain?: string; email?: string }>
      }
    >()

    for (const row of rows) {
      if (sinceMs !== undefined && row.updatedAt < sinceMs) continue
      const entry = grouped.get(row.websetId)
      if (entry) {
        entry.count++
        if (row.updatedAt > entry.newestAt) entry.newestAt = row.updatedAt
        if (entry.preview.length < 5) {
          entry.preview.push({
            companyName: row.companyName,
            domain: row.domain,
            email: row.email,
          })
        }
      } else {
        grouped.set(row.websetId, {
          websetId: row.websetId,
          websetTitle: row.websetTitle,
          sourceRunId: row.sourceRunId,
          count: 1,
          newestAt: row.updatedAt,
          preview: [
            {
              companyName: row.companyName,
              domain: row.domain,
              email: row.email,
            },
          ],
        })
      }
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.newestAt - a.newestAt)
      .slice(0, take)
  },
})

/** Flat item list for a single webset — used when the user drills in. */
export const listForWebset = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    websetId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, websetId, limit }) => {
    const take = Math.min(Math.max(limit ?? 100, 1), 500)
    return await ctx.db
      .query(TABLES.WEBSET_ITEMS)
      .withIndex(INDEXES.BY_TENANT_WEBSET, (q) =>
        q.eq('tenantId', tenantId).eq('websetId', websetId)
      )
      .order('desc')
      .take(take)
  },
})
