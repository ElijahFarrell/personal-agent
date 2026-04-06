import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, INBOX_PROVIDER, TABLES } from './constants'

const unipileProviderValidator = v.union(
  v.literal(INBOX_PROVIDER.LINKEDIN),
  v.literal(INBOX_PROVIDER.WHATSAPP)
)

const unipileStatusValidator = v.union(
  v.literal('operational'),
  v.literal('credentials_required'),
  v.literal('paused')
)

export const getByUserAndProvider = query({
  args: {
    userId: v.id(TABLES.USERS),
    provider: unipileProviderValidator,
  },
  handler: async (ctx, { userId, provider }) => {
    return await ctx.db
      .query(TABLES.UNIPILE_ACCOUNTS)
      .withIndex(INDEXES.BY_USER_PROVIDER, (q) =>
        q.eq('userId', userId).eq('provider', provider)
      )
      .unique()
  },
})

export const listByUser = query({
  args: {
    userId: v.id(TABLES.USERS),
  },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query(TABLES.UNIPILE_ACCOUNTS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .collect()
  },
})

export const getByExternalAccountId = query({
  args: {
    externalAccountId: v.string(),
  },
  handler: async (ctx, { externalAccountId }) => {
    return await ctx.db
      .query(TABLES.UNIPILE_ACCOUNTS)
      .withIndex(INDEXES.BY_EXTERNAL_ACCOUNT_ID, (q) =>
        q.eq('externalAccountId', externalAccountId)
      )
      .unique()
  },
})

export const upsert = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    provider: unipileProviderValidator,
    externalAccountId: v.string(),
    status: unipileStatusValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query(TABLES.UNIPILE_ACCOUNTS)
      .withIndex(INDEXES.BY_USER_PROVIDER, (q) =>
        q.eq('userId', args.userId).eq('provider', args.provider)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        externalAccountId: args.externalAccountId,
        status: args.status,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert(TABLES.UNIPILE_ACCOUNTS, {
      tenantId: args.tenantId,
      userId: args.userId,
      provider: args.provider,
      externalAccountId: args.externalAccountId,
      status: args.status,
      connectedAt: now,
      updatedAt: now,
    })
  },
})

export const updateStatus = mutation({
  args: {
    externalAccountId: v.string(),
    status: unipileStatusValidator,
  },
  handler: async (ctx, { externalAccountId, status }) => {
    const existing = await ctx.db
      .query(TABLES.UNIPILE_ACCOUNTS)
      .withIndex(INDEXES.BY_EXTERNAL_ACCOUNT_ID, (q) =>
        q.eq('externalAccountId', externalAccountId)
      )
      .unique()
    if (!existing) {
      throw new Error('Unipile account not found')
    }
    await ctx.db.patch(existing._id, {
      status,
      updatedAt: Date.now(),
    })
    return existing._id
  },
})

export const remove = mutation({
  args: {
    userId: v.id(TABLES.USERS),
    provider: unipileProviderValidator,
  },
  handler: async (ctx, { userId, provider }) => {
    const existing = await ctx.db
      .query(TABLES.UNIPILE_ACCOUNTS)
      .withIndex(INDEXES.BY_USER_PROVIDER, (q) =>
        q.eq('userId', userId).eq('provider', provider)
      )
      .unique()

    if (!existing) {
      return { removed: false }
    }

    await ctx.db.delete(existing._id)
    return { removed: true }
  },
})
