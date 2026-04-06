import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, TABLES } from './constants'

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Upsert a marketing chat lead.
 *
 * Identity priority:
 *   1. Existing lead for this sessionId → patch with any new info
 *   2. Existing lead by email (different session) → patch with new info
 *   3. No match → insert new lead
 *
 * Requires at least one of: name, email, phone.
 */
export const captureLead = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    useCase: v.optional(v.string()),
    sessionId: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const email = args.email?.trim().toLowerCase() || undefined

    const patch = {
      ...(args.name?.trim() && { name: args.name.trim() }),
      ...(email && { email }),
      ...(args.phone?.trim() && { phone: args.phone.trim() }),
      ...(args.company?.trim() && { company: args.company.trim() }),
      ...(args.useCase?.trim() && { useCase: args.useCase.trim() }),
      updatedAt: now,
    }

    // 1. Look up by sessionId first
    const bySession = await ctx.db
      .query(TABLES.MARKETING_CHAT_LEADS)
      .withIndex(INDEXES.BY_MARKETING_LEAD_SESSION, (q) =>
        q.eq('sessionId', args.sessionId)
      )
      .first()

    if (bySession) {
      await ctx.db.patch(bySession._id, patch)
      return { leadId: bySession._id, created: false }
    }

    // 2. Look up by email if provided
    if (email) {
      const byEmail = await ctx.db
        .query(TABLES.MARKETING_CHAT_LEADS)
        .withIndex(INDEXES.BY_MARKETING_LEAD_EMAIL, (q) => q.eq('email', email))
        .first()

      if (byEmail) {
        await ctx.db.patch(byEmail._id, patch)
        return { leadId: byEmail._id, created: false }
      }
    }

    // 3. Create new lead
    const leadId = await ctx.db.insert(TABLES.MARKETING_CHAT_LEADS, {
      name: args.name?.trim(),
      email,
      phone: args.phone?.trim(),
      company: args.company?.trim(),
      useCase: args.useCase?.trim(),
      sessionId: args.sessionId,
      ipAddress: args.ipAddress,
      createdAt: now,
      updatedAt: now,
    })

    return { leadId, created: true }
  },
})

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query(TABLES.MARKETING_CHAT_LEADS)
      .withIndex(INDEXES.BY_MARKETING_LEAD_EMAIL, (q) =>
        q.eq('email', email.trim().toLowerCase())
      )
      .first()
  },
})

/** Admin-only: return all leads ordered by newest first (up to 500). */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query(TABLES.MARKETING_CHAT_LEADS)
      .order('desc')
      .take(500)
  },
})
