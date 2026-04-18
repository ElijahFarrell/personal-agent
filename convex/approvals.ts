import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { APPROVAL_STATUS, INDEXES, TABLES } from './constants'

/**
 * Human-approval registry for destructive tool calls (MCP elicitation).
 *
 * The orchestrator never calls destructive tools directly — every invocation
 * passes through {@link src/mastra/mcp/elicitation.ts}, which on the first
 * call writes a PENDING row here and returns a `NEEDS_APPROVAL` envelope.
 * The user decides via the UI (`approve` / `reject` mutations). When the
 * orchestrator retries with the token, `consumeToken` validates and marks the
 * row as consumed so it can't be replayed.
 *
 * All public mutations are tenant-scoped through explicit tenantId args; the
 * Next.js route handler authenticates the caller and supplies it.
 */

const statusValidator = v.union(
  v.literal(APPROVAL_STATUS.PENDING),
  v.literal(APPROVAL_STATUS.APPROVED),
  v.literal(APPROVAL_STATUS.REJECTED),
  v.literal(APPROVAL_STATUS.EXPIRED)
)

/** Default TTL for pending approvals. Past this they are auto-expired on read. */
const DEFAULT_TTL_MS = 30 * 60 * 1000

/**
 * Create a pending approval row. Called by the elicitation gate on the first
 * invocation of a destructive tool. Returns the new row id and token.
 *
 * Exposed as a public mutation because the elicitation gate runs in the
 * Next.js route (via `ConvexHttpClient`), not in another Convex action. The
 * caller is authenticated at the route level before this is invoked.
 */
export const request = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    threadId: v.optional(v.string()),
    runId: v.optional(v.id(TABLES.AGENT_RUNS)),
    agentId: v.optional(v.string()),
    toolId: v.string(),
    summary: v.string(),
    toolArgs: v.optional(v.any()),
    approvalToken: v.string(),
    ttlMs: v.optional(v.number()),
  },
  returns: v.object({
    approvalId: v.id(TABLES.APPROVALS),
    approvalToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now()
    const expiresAt = now + (args.ttlMs ?? DEFAULT_TTL_MS)
    const approvalId = await ctx.db.insert(TABLES.APPROVALS, {
      tenantId: args.tenantId,
      userId: args.userId,
      threadId: args.threadId,
      runId: args.runId,
      agentId: args.agentId,
      toolId: args.toolId,
      summary: args.summary,
      toolArgs: args.toolArgs,
      approvalToken: args.approvalToken,
      status: APPROVAL_STATUS.PENDING,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    return { approvalId, approvalToken: args.approvalToken }
  },
})

/** Lookup used by the elicitation gate (called via `ConvexHttpClient`). */
export const getByToken = query({
  args: { approvalToken: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id(TABLES.APPROVALS),
      tenantId: v.id(TABLES.TENANTS),
      userId: v.id(TABLES.USERS),
      status: statusValidator,
      toolId: v.string(),
      expiresAt: v.number(),
    })
  ),
  handler: async (ctx, { approvalToken }) => {
    const row = await ctx.db
      .query(TABLES.APPROVALS)
      .withIndex(INDEXES.BY_APPROVAL_TOKEN, (q) =>
        q.eq('approvalToken', approvalToken)
      )
      .unique()
    if (!row) return null
    return {
      _id: row._id,
      tenantId: row.tenantId,
      userId: row.userId,
      status: row.status,
      toolId: row.toolId,
      expiresAt: row.expiresAt,
    }
  },
})

/**
 * Atomically consume an APPROVED token — flips status to REJECTED afterwards
 * so the same approval can't be replayed.
 *
 * Called from the elicitation gate right before executing the underlying
 * tool. Returns `{ ok: true }` iff the row was found APPROVED and non-expired.
 */
export const consumeToken = mutation({
  args: { approvalToken: v.string(), toolId: v.string() },
  returns: v.object({
    ok: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, { approvalToken, toolId }) => {
    const row = await ctx.db
      .query(TABLES.APPROVALS)
      .withIndex(INDEXES.BY_APPROVAL_TOKEN, (q) =>
        q.eq('approvalToken', approvalToken)
      )
      .unique()
    if (!row) return { ok: false, reason: 'unknown_token' }
    if (row.toolId !== toolId) {
      return { ok: false, reason: 'token_tool_mismatch' }
    }
    if (row.status === APPROVAL_STATUS.EXPIRED) {
      return { ok: false, reason: 'expired' }
    }
    if (row.status === APPROVAL_STATUS.REJECTED) {
      return { ok: false, reason: 'rejected' }
    }
    if (row.status === APPROVAL_STATUS.PENDING) {
      return { ok: false, reason: 'pending' }
    }
    const now = Date.now()
    if (now > row.expiresAt) {
      await ctx.db.patch(row._id, {
        status: APPROVAL_STATUS.EXPIRED,
        updatedAt: now,
      })
      return { ok: false, reason: 'expired' }
    }
    await ctx.db.patch(row._id, {
      status: APPROVAL_STATUS.REJECTED,
      updatedAt: now,
      decidedNote: 'consumed',
    })
    return { ok: true }
  },
})

/** User-facing approve mutation invoked by the approval card UI. */
export const approve = mutation({
  args: {
    approvalId: v.id(TABLES.APPROVALS),
    decidedBy: v.id(TABLES.USERS),
    note: v.optional(v.string()),
  },
  returns: v.object({ status: statusValidator }),
  handler: async (ctx, { approvalId, decidedBy, note }) => {
    const row = await ctx.db.get(approvalId)
    if (!row) throw new Error('Approval not found')
    if (row.status !== APPROVAL_STATUS.PENDING) {
      return { status: row.status }
    }
    const now = Date.now()
    if (now > row.expiresAt) {
      await ctx.db.patch(approvalId, {
        status: APPROVAL_STATUS.EXPIRED,
        updatedAt: now,
      })
      return { status: APPROVAL_STATUS.EXPIRED }
    }
    await ctx.db.patch(approvalId, {
      status: APPROVAL_STATUS.APPROVED,
      decidedBy,
      decidedAt: now,
      decidedNote: note,
      updatedAt: now,
    })
    return { status: APPROVAL_STATUS.APPROVED }
  },
})

export const reject = mutation({
  args: {
    approvalId: v.id(TABLES.APPROVALS),
    decidedBy: v.id(TABLES.USERS),
    note: v.optional(v.string()),
  },
  returns: v.object({ status: statusValidator }),
  handler: async (ctx, { approvalId, decidedBy, note }) => {
    const row = await ctx.db.get(approvalId)
    if (!row) throw new Error('Approval not found')
    if (row.status !== APPROVAL_STATUS.PENDING) {
      return { status: row.status }
    }
    const now = Date.now()
    await ctx.db.patch(approvalId, {
      status: APPROVAL_STATUS.REJECTED,
      decidedBy,
      decidedAt: now,
      decidedNote: note,
      updatedAt: now,
    })
    return { status: APPROVAL_STATUS.REJECTED }
  },
})

/** List pending approvals for a thread — consumed by the chat UI's approval card. */
export const listPendingForThread = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    threadId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id(TABLES.APPROVALS),
      toolId: v.string(),
      summary: v.string(),
      toolArgs: v.optional(v.any()),
      agentId: v.optional(v.string()),
      createdAt: v.number(),
      expiresAt: v.number(),
    })
  ),
  handler: async (ctx, { tenantId, threadId }) => {
    const rows = await ctx.db
      .query(TABLES.APPROVALS)
      .withIndex(INDEXES.BY_THREAD_ID, (q) => q.eq('threadId', threadId))
      .collect()
    const now = Date.now()
    return rows
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.status === APPROVAL_STATUS.PENDING &&
          r.expiresAt > now
      )
      .map((r) => ({
        _id: r._id,
        toolId: r.toolId,
        summary: r.summary,
        toolArgs: r.toolArgs,
        agentId: r.agentId,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
      }))
      .sort((a, b) => a.createdAt - b.createdAt)
  },
})
