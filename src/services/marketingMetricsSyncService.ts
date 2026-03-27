/**
 * Syncs marketing campaign metrics from Composio (Lemlist) into Convex.
 */
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { executeComposioTool } from '@/lib/composio'
import { getComposioConnectionStatus } from '@/lib/composio'
import { MARKETING_METRIC_SOURCE } from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const LIST_TOOL = 'LEMLIST_GET_LIST_CAMPAIGNS'
const STATS_TOOL = 'LEMLIST_GET_CAMPAIGN_STATS'

const MAX_CAMPAIGNS = 40
const MAX_STATS_FETCH = 25

function extractCampaignList(data: unknown): Array<Record<string, unknown>> {
  if (data === null || data === undefined) return []
  const unwrap = (x: unknown): unknown => {
    if (x && typeof x === 'object' && 'data' in (x as object)) {
      return (x as { data: unknown }).data
    }
    return x
  }
  const inner = unwrap(data)
  if (Array.isArray(inner)) return inner as Array<Record<string, unknown>>
  if (inner && typeof inner === 'object') {
    const c = (inner as Record<string, unknown>).campaigns
    if (Array.isArray(c)) return c as Array<Record<string, unknown>>
  }
  return []
}

function campaignIdFromRow(row: Record<string, unknown>): string | null {
  const id =
    (typeof row._id === 'string' && row._id) ||
    (typeof row.id === 'string' && row.id) ||
    (typeof row.campaignId === 'string' && row.campaignId)
  return id ?? null
}

function campaignLabelFromRow(row: Record<string, unknown>): string {
  const name =
    (typeof row.name === 'string' && row.name) ||
    (typeof row.label === 'string' && row.label) ||
    (typeof row.title === 'string' && row.title)
  return name?.trim() || 'Campaign'
}

/** Best-effort extraction from Lemlist stats payload (shape varies by API version). */
function normalizeLemlistStatsPayload(raw: unknown): {
  sent?: number
  replied?: number
  opened?: number
  bounced?: number
  clicked?: number
} {
  if (raw === null || raw === undefined || typeof raw !== 'object') return {}
  const unwrap = (): Record<string, unknown> => {
    const d = raw as Record<string, unknown>
    if (d.data && typeof d.data === 'object') return d.data as Record<string, unknown>
    return d
  }
  const root = unwrap()
  const nums = (o: Record<string, unknown>, keys: string[]): number | undefined => {
    for (const k of keys) {
      const v = o[k]
      if (typeof v === 'number' && !Number.isNaN(v)) return v
    }
    return undefined
  }

  let sent = nums(root, ['emailsSent', 'sent', 'messagesSent', 'totalSent'])
  let replied = nums(root, ['emailsReplied', 'replied', 'replies', 'totalReplied'])
  let opened = nums(root, ['emailsOpened', 'opened', 'opens', 'totalOpened'])
  let bounced = nums(root, ['emailsBounced', 'bounced', 'bounces'])
  let clicked = nums(root, ['emailsClicked', 'clicked', 'clicks'])

  const channels = root.channels
  if (channels && typeof channels === 'object') {
    const ch = channels as Record<string, Record<string, unknown>>
    for (const sub of Object.values(ch)) {
      if (sub && typeof sub === 'object') {
        sent = sent ?? nums(sub, ['sent', 'emailsSent'])
        replied = replied ?? nums(sub, ['replied', 'emailsReplied'])
        opened = opened ?? nums(sub, ['opened', 'emailsOpened'])
        clicked = clicked ?? nums(sub, ['clicked', 'emailsClicked'])
      }
    }
  }

  const stats = root.stats
  if (stats && typeof stats === 'object') {
    const s = stats as Record<string, unknown>
    sent = sent ?? nums(s, ['sent', 'emailsSent'])
    replied = replied ?? nums(s, ['replied', 'replies'])
    opened = opened ?? nums(s, ['opened', 'opens'])
  }

  return {
    ...(sent !== undefined ? { sent } : {}),
    ...(replied !== undefined ? { replied } : {}),
    ...(opened !== undefined ? { opened } : {}),
    ...(bounced !== undefined ? { bounced } : {}),
    ...(clicked !== undefined ? { clicked } : {}),
  }
}

export type SyncLemlistResult =
  | { ok: true; inserted: number; syncedAt: number }
  | { ok: false; reason: 'not_connected' | 'list_failed' | 'no_campaigns'; error?: string }

export async function syncLemlistMetricsForUser(params: {
  clerkUserId: string
  tenantId: Id<'tenants'>
}): Promise<SyncLemlistResult> {
  const { clerkUserId, tenantId } = params

  const status = await getComposioConnectionStatus(clerkUserId)
  if (!status.lemlist) {
    return { ok: false, reason: 'not_connected' }
  }

  const listRes = await executeComposioTool<unknown>(clerkUserId, LIST_TOOL, {
    limit: MAX_CAMPAIGNS,
  })

  if (!listRes.successful) {
    return {
      ok: false,
      reason: 'list_failed',
      error: listRes.error ?? 'Failed to list campaigns',
    }
  }

  const campaigns = extractCampaignList(listRes.data)
  if (campaigns.length === 0) {
    return { ok: false, reason: 'no_campaigns' }
  }

  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const startDate = start.toISOString()
  const endDate = end.toISOString()

  const rows: Array<{
    externalId: string
    label: string
    periodStart: number
    periodEnd: number
    metrics: {
      sent?: number
      replied?: number
      opened?: number
      bounced?: number
      clicked?: number
    }
    rawPayload?: unknown
  }> = []

  const toFetch = campaigns.slice(0, MAX_STATS_FETCH)
  for (const row of toFetch) {
    const externalId = campaignIdFromRow(row)
    if (!externalId) continue

    const statsRes = await executeComposioTool<unknown>(clerkUserId, STATS_TOOL, {
      campaignId: externalId,
      startDate,
      endDate,
    })

    const rawPayload = statsRes.data
    const metrics = statsRes.successful
      ? normalizeLemlistStatsPayload(rawPayload)
      : {}

    rows.push({
      externalId,
      label: campaignLabelFromRow(row),
      periodStart: start.getTime(),
      periodEnd: end.getTime(),
      metrics,
      ...(rawPayload !== undefined ? { rawPayload } : {}),
    })
  }

  if (rows.length === 0) {
    return { ok: false, reason: 'no_campaigns' }
  }

  const result = await convex.mutation(api.marketingMetrics.replaceSnapshotsForSource, {
    clerkUserId,
    tenantId,
    source: MARKETING_METRIC_SOURCE.LEMLIST,
    rows,
  })

  return {
    ok: true,
    inserted: result.inserted,
    syncedAt: result.syncedAt,
  }
}
