import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { INBOX_AI_USAGE_KIND, TABLES } from './constants'

export const record = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    kind: v.union(
      v.literal(INBOX_AI_USAGE_KIND.DRAFT_REPLY),
      v.literal(INBOX_AI_USAGE_KIND.SUMMARIZE)
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert(TABLES.INBOX_AI_USAGE, {
      tenantId: args.tenantId,
      userId: args.userId,
      kind: args.kind,
      createdAt: Date.now(),
    })
  },
})
