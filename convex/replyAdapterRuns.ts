import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { REPLY_ADAPTER, REPLY_ADAPTER_RUN_STATUS, TABLES } from './constants'

const adapterValidator = v.union(
  v.literal(REPLY_ADAPTER.SMS_WEBHOOK),
  v.literal(REPLY_ADAPTER.SMARTER_CONTACT_BROWSER)
)

const statusValidator = v.union(
  v.literal(REPLY_ADAPTER_RUN_STATUS.RUNNING),
  v.literal(REPLY_ADAPTER_RUN_STATUS.SUCCEEDED),
  v.literal(REPLY_ADAPTER_RUN_STATUS.FAILED)
)

export const start = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    adapter: adapterValidator,
  },
  returns: v.id(TABLES.REPLY_ADAPTER_RUNS),
  handler: async (ctx, { tenantId, adapter }) => {
    return await ctx.db.insert(TABLES.REPLY_ADAPTER_RUNS, {
      tenantId,
      adapter,
      status: REPLY_ADAPTER_RUN_STATUS.RUNNING,
      startedAt: Date.now(),
      threadsSeen: 0,
      newMessages: 0,
    })
  },
})

export const finish = mutation({
  args: {
    runId: v.id(TABLES.REPLY_ADAPTER_RUNS),
    status: statusValidator,
    threadsSeen: v.number(),
    newMessages: v.number(),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { runId, status, threadsSeen, newMessages, error }) => {
    const row = await ctx.db.get(runId)
    if (!row) throw new Error('Adapter run not found')
    await ctx.db.patch(runId, {
      status,
      threadsSeen,
      newMessages,
      error,
      finishedAt: Date.now(),
    })
    return null
  },
})
