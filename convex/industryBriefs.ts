/**
 * Cached industry research briefs used to ground the Free AI Audit report.
 *
 * Briefs are keyed by a normalized `industrySlug` and reused across submissions
 * for `BRIEF_TTL_MS` (7 days). The actual research generation happens in the
 * Next.js API layer (`src/lib/audit/industry-research.ts`); this module only
 * provides the read-through cache primitives.
 */
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

const BRIEF_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Read a cached brief if one exists. Callers receive `null` on miss; returning
 * an expired row is intentional so callers can decide whether to refresh
 * synchronously (audit submit) or accept staleness (background usage).
 */
export const getBySlug = query({
  args: { industrySlug: v.string() },
  handler: async (ctx, { industrySlug }) => {
    const slug = industrySlug.trim().toLowerCase()
    if (!slug) return null
    const row = await ctx.db
      .query(TABLES.INDUSTRY_BRIEFS)
      .withIndex(INDEXES.BY_INDUSTRY_SLUG, (q) =>
        q.eq('industrySlug', slug)
      )
      .first()
    if (!row) return null
    return {
      industrySlug: row.industrySlug,
      industryLabel: row.industryLabel,
      brief: row.brief,
      sources: row.sources,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      isFresh: row.expiresAt > Date.now(),
    }
  },
})

/**
 * Insert or replace a brief for `industrySlug`. We delete the prior row rather
 * than patching to avoid stacking metadata across regenerations.
 */
export const upsert = mutation({
  args: {
    industrySlug: v.string(),
    industryLabel: v.string(),
    brief: v.string(),
    sources: v.array(
      v.object({
        title: v.string(),
        url: v.string(),
      })
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const slug = args.industrySlug.trim().toLowerCase()
    if (!slug) throw new Error('industrySlug is required')

    const existing = await ctx.db
      .query(TABLES.INDUSTRY_BRIEFS)
      .withIndex(INDEXES.BY_INDUSTRY_SLUG, (q) =>
        q.eq('industrySlug', slug)
      )
      .first()
    if (existing) await ctx.db.delete(existing._id)

    const now = Date.now()
    const id = await ctx.db.insert(TABLES.INDUSTRY_BRIEFS, {
      industrySlug: slug,
      industryLabel: args.industryLabel.trim(),
      brief: args.brief,
      sources: args.sources,
      metadata: args.metadata,
      createdAt: now,
      expiresAt: now + BRIEF_TTL_MS,
    })
    return { id, expiresAt: now + BRIEF_TTL_MS }
  },
})
