import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { INBOX_PROVIDER, INDEXES, TABLES } from './constants'

/** Records a reply sent from the unified inbox UI (not prospect outreach drafts). */
export const recordOutbound = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    threadId: v.optional(v.id(TABLES.INBOX_THREADS)),
    provider: v.union(
      v.literal(INBOX_PROVIDER.GMAIL),
      v.literal(INBOX_PROVIDER.OUTLOOK),
      v.literal(INBOX_PROVIDER.LINKEDIN),
      v.literal(INBOX_PROVIDER.WHATSAPP),
      v.literal(INBOX_PROVIDER.SMS)
    ),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert(TABLES.INBOX_OUTBOUND_EVENTS, {
      tenantId: args.tenantId,
      userId: args.userId,
      threadId: args.threadId,
      provider: args.provider,
      sentAt: args.sentAt,
    })
  },
})
