/**
 * GET/POST /api/metaAdsInsights
 *
 * Uses Composio METAADS_GET_AD_ACCOUNTS to resolve ad accounts, then
 * METAADS_GET_INSIGHTS for campaign-level metrics (last 7d by default).
 * See: https://docs.composio.dev/tools/metaads
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { isIntegrationAllowed } from '@/constants/featureGating'
import { config } from '@/lib/config'
import { executeComposioTool, getComposioConnectionStatus } from '@/lib/composio'

export const dynamic = 'force-dynamic'

const TOOL_AD_ACCOUNTS = 'METAADS_GET_AD_ACCOUNTS'
const TOOL_INSIGHTS = 'METAADS_GET_INSIGHTS'

function unwrapRecordArray(payload: unknown): Record<string, unknown>[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (typeof payload !== 'object') return []
  const o = payload as Record<string, unknown>
  const data = o.data
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') {
    const inner = (data as Record<string, unknown>).data
    if (Array.isArray(inner)) return inner as Record<string, unknown>[]
  }
  return []
}

function normalizeActId(id: string): string {
  const s = id.trim()
  if (s.startsWith('act_')) return s
  return `act_${s.replace(/^act_/, '')}`
}

function parseAdAccounts(raw: unknown): Array<{ id: string; name?: string }> {
  const rows = unwrapRecordArray(raw)
  const out: Array<{ id: string; name?: string }> = []
  for (const row of rows) {
    const rawId = row.id ?? row.account_id
    if (rawId == null) continue
    out.push({
      id: normalizeActId(String(rawId)),
      name: row.name != null ? String(row.name) : undefined,
    })
  }
  return out
}

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

export interface MetaAdsInsightsPayload {
  accounts: Array<{ id: string; name?: string }>
  kpis: Array<{ label: string; value: string }>
  series: Array<{ name: string; spend: number; impressions: number; clicks: number }>
  rows: Array<Record<string, string | number | undefined>>
  selectedObjectId: string | null
  datePreset: string
}

async function buildInsightsResponse(
  userId: string,
  requestedObjectId: string | undefined,
  datePreset: string
): Promise<MetaAdsInsightsPayload> {
  const accountsRes = await executeComposioTool<Record<string, unknown>>(
    userId,
    TOOL_AD_ACCOUNTS,
    { limit: 25 }
  )

  if (!accountsRes.successful) {
    throw new Error(accountsRes.error ?? 'Failed to list Meta ad accounts')
  }

  const accounts = parseAdAccounts(accountsRes.data)
  let selectedObjectId: string | null = null

  if (requestedObjectId) {
    const want = normalizeActId(requestedObjectId)
    if (accounts.some((a) => a.id === want)) {
      selectedObjectId = want
    }
  }
  if (!selectedObjectId) {
    selectedObjectId = accounts[0]?.id ?? null
  }

  if (!selectedObjectId) {
    return {
      accounts: [],
      kpis: [],
      series: [],
      rows: [],
      selectedObjectId: null,
      datePreset,
    }
  }

  const insightsRes = await executeComposioTool<Record<string, unknown>>(userId, TOOL_INSIGHTS, {
    object_id: selectedObjectId,
    level: 'campaign',
    date_preset: datePreset,
    fields: [
      'impressions',
      'clicks',
      'spend',
      'reach',
      'cpc',
      'cpm',
      'ctr',
      'campaign_name',
      'campaign_id',
    ],
  })

  if (!insightsRes.successful) {
    throw new Error(insightsRes.error ?? 'Failed to fetch Meta Ads insights')
  }

  const insightRows = unwrapRecordArray(insightsRes.data)

  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalReach = 0

  const series: MetaAdsInsightsPayload['series'] = []
  const rows: MetaAdsInsightsPayload['rows'] = []

  for (const r of insightRows) {
    const spend = num(r.spend)
    const impressions = num(r.impressions)
    const clicks = num(r.clicks)
    const reach = num(r.reach)
    totalSpend += spend
    totalImpressions += impressions
    totalClicks += clicks
    totalReach += reach

    const name = (r.campaign_name as string | undefined) ?? (r.campaign_id as string | undefined) ?? 'Campaign'
    series.push({ name: String(name), spend, impressions, clicks })
    rows.push({
      campaign: String(name),
      campaign_id: r.campaign_id != null ? String(r.campaign_id) : undefined,
      spend,
      impressions,
      clicks,
      reach,
      cpc: r.cpc != null ? num(r.cpc) : undefined,
      cpm: r.cpm != null ? num(r.cpm) : undefined,
      ctr: r.ctr != null ? num(r.ctr) : undefined,
    })
  }

  const kpis: MetaAdsInsightsPayload['kpis'] = [
    { label: 'Spend', value: totalSpend.toFixed(2) },
    { label: 'Impressions', value: String(Math.round(totalImpressions)) },
    { label: 'Clicks', value: String(Math.round(totalClicks)) },
    { label: 'Reach', value: String(Math.round(totalReach)) },
  ]

  return {
    accounts,
    kpis,
    series,
    rows,
    selectedObjectId,
    datePreset,
  }
}

async function handleInsights(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantCtx = await getTenantContext()
  const { config: orgConfig } = tenantCtx

  if (!isIntegrationAllowed(orgConfig, 'metaAds')) {
    return NextResponse.json(
      { error: 'Meta Ads is not allowed for your organization.' },
      { status: 403 }
    )
  }

  if (!config.composio.apiKey) {
    return NextResponse.json({ error: 'Composio is not configured.' }, { status: 503 })
  }

  const status = await getComposioConnectionStatus(userId)
  if (!status.metaAds) {
    return NextResponse.json(
      { error: 'Connect Meta Ads under Integrations to load insights.' },
      { status: 403 }
    )
  }

  let objectId: string | undefined
  let datePreset = 'last_7d'

  if (req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as {
      objectId?: string
      datePreset?: string
    }
    objectId = typeof body.objectId === 'string' ? body.objectId.trim() : undefined
    if (typeof body.datePreset === 'string' && body.datePreset.trim()) {
      datePreset = body.datePreset.trim()
    }
  } else {
    const sp = req.nextUrl.searchParams
    const raw = sp.get('objectId')
    objectId = raw?.trim() || undefined
    const dp = sp.get('datePreset')
    if (dp) datePreset = dp
  }

  try {
    const payload = await buildInsightsResponse(userId, objectId, datePreset)
    return NextResponse.json(payload)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function GET(req: NextRequest) {
  return handleInsights(req)
}

export async function POST(req: NextRequest) {
  return handleInsights(req)
}
