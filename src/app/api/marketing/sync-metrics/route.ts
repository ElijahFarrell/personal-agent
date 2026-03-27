import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { isIntegrationAllowed } from '@/constants/featureGating'
import { syncLemlistMetricsForUser } from '@/services/marketingMetricsSyncService'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(_req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId: clerkUserId, config } = tenantCtx

    if (!isIntegrationAllowed(config, 'lemlist')) {
      return NextResponse.json(
        { error: 'Lemlist is not available for your organization.' },
        { status: 403 }
      )
    }

    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId })
      .catch(() => null)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const result = await syncLemlistMetricsForUser({
      clerkUserId,
      tenantId: dbUser.tenantId,
    })

    if (!result.ok) {
      if (result.reason === 'not_connected') {
        return NextResponse.json(
          { ok: false, reason: result.reason, error: 'Connect Lemlist in Integrations first.' },
          { status: 400 }
        )
      }
      if (result.reason === 'list_failed') {
        return NextResponse.json(
          { ok: false, reason: result.reason, error: result.error ?? 'Failed to fetch campaigns' },
          { status: 502 }
        )
      }
      return NextResponse.json({
        ok: false,
        reason: result.reason,
        error:
          result.reason === 'no_campaigns'
            ? 'No campaigns found or could not load stats.'
            : undefined,
      })
    }

    return NextResponse.json({
      ok: true,
      inserted: result.inserted,
      syncedAt: result.syncedAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    console.error('[marketing/sync-metrics]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
