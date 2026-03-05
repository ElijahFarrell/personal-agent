import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { INDEXES, TABLES } from './constants'

const TOKEN_TTL_MS = 10 * 60 * 1000 // 10 minutes

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)
}

export const createLinkToken = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const now = Date.now()
    const expiresAt = now + TOKEN_TTL_MS
    const token = generateToken()

    await ctx.db.insert(TABLES.TELEGRAM_LINK_TOKENS, {
      token,
      clerkUserId,
      expiresAt,
      createdAt: now,
    })

    return { token }
  },
})

export const consumeLinkToken = mutation({
  args: {
    token: v.string(),
    telegramId: v.string(),
  },
  handler: async (ctx, { token, telegramId }) => {
    const record = await ctx.db
      .query(TABLES.TELEGRAM_LINK_TOKENS)
      .withIndex(INDEXES.BY_TOKEN, (q) => q.eq('token', token))
      .unique()

    if (!record) return { success: false as const, error: 'Invalid or expired token' }
    if (record.expiresAt < Date.now()) {
      await ctx.db.delete(record._id)
      return { success: false as const, error: 'Token expired' }
    }

    const clerkUserId = record.clerkUserId

    const existingWithTelegram = await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_TELEGRAM_ID, (q) => q.eq('telegramId', telegramId))
      .first()
    if (existingWithTelegram && existingWithTelegram.clerkUserId !== clerkUserId) {
      await ctx.db.delete(record._id)
      return { success: false as const, error: 'This Telegram account is already linked to another user' }
    }

    const user = await ctx.db
      .query(TABLES.USERS)
      .withIndex(INDEXES.BY_CLERK_USER_ID, (q) => q.eq('clerkUserId', clerkUserId))
      .unique()
    if (!user) {
      await ctx.db.delete(record._id)
      return { success: false as const, error: 'User not found' }
    }

    await ctx.db.patch(user._id, { telegramId })
    await ctx.db.delete(record._id)

    return { success: true as const, clerkUserId }
  },
})
