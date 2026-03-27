/**
 * Rule-based lead scores (0–100) from pipeline stage, inbox engagement, and research.
 */
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const MODEL_VERSION = 'v1-rules'

const STAGE_BASE: Record<string, number> = {
  new: 18,
  messaged: 32,
  follow_up: 42,
  meeting_booked: 68,
  interested: 62,
  deal_open: 72,
  dead: 8,
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function computeLeadScoreFromSignals(input: {
  stage: string
  hasResearch: boolean
  threadCount: number
  needsReplyAny: boolean
  lastInboundAt: number | null
}): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {}
  breakdown.stage = STAGE_BASE[input.stage] ?? STAGE_BASE.new
  if (input.hasResearch) breakdown.research = 12
  if (input.needsReplyAny) breakdown.needs_reply = 15
  breakdown.threads = clamp(Math.min(3, input.threadCount) * 5, 0, 15)
  const now = Date.now()
  if (input.lastInboundAt && now - input.lastInboundAt < 72 * 60 * 60 * 1000) {
    breakdown.recency = 10
  }

  const score = clamp(
    Object.values(breakdown).reduce((a, b) => a + b, 0),
    0,
    100
  )
  return { score, breakdown }
}

export async function rescoreTenantProspectsFromInbox(params: {
  tenantId: Id<'tenants'>
  inboxUserId: Id<'users'>
}): Promise<{ updated: number }> {
  const [threads, prospects] = await Promise.all([
    convex.query(api.inbox.listThreadsForUser, {
      userId: params.inboxUserId,
      limit: 500,
      sortOrder: 'recent',
    }),
    convex.query(api.prospects.getProspectsByTenantId, {
      tenantId: params.tenantId,
    }),
  ])

  const agg = new Map<
    string,
    { threadCount: number; needsReplyAny: boolean; lastInboundAt: number | null }
  >()

  for (const t of threads ?? []) {
    if (!t.prospectId) continue
    const key = String(t.prospectId)
    const cur = agg.get(key) ?? {
      threadCount: 0,
      needsReplyAny: false,
      lastInboundAt: null as number | null,
    }
    cur.threadCount += 1
    if (t.needsReply) {
      cur.needsReplyAny = true
      if (
        t.lastMessageAt &&
        (!cur.lastInboundAt || t.lastMessageAt > cur.lastInboundAt)
      ) {
        cur.lastInboundAt = t.lastMessageAt
      }
    }
    agg.set(key, cur)
  }

  let updated = 0
  for (const p of prospects ?? []) {
    const stage = p.stage ?? 'new'
    const snap = await convex.query(api.prospects.getResearchSnapshot, {
      prospectId: p._id,
    })
    const hasResearch = !!snap

    const g = agg.get(String(p._id))
    const { score, breakdown } = computeLeadScoreFromSignals({
      stage,
      hasResearch,
      threadCount: g?.threadCount ?? 0,
      needsReplyAny: g?.needsReplyAny ?? false,
      lastInboundAt: g?.lastInboundAt ?? null,
    })

    await convex.mutation(api.prospects.updateProspect, {
      prospectId: p._id,
      leadScore: score,
      scoreBreakdown: breakdown,
      scoreUpdatedAt: Date.now(),
      scoreModelVersion: MODEL_VERSION,
    })
    updated++
  }

  return { updated }
}
