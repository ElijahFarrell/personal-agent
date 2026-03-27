import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { tenantConfigFromConvexRow } from '@/lib/convexTenantConfig'
import {
  accessContextFromTenantRow,
  resolvePlatformConfig,
} from '@/platform/niche'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Server-resolved gating: niche pack + tenant row + env allowlists + fullPlatformAccess flag.
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clerkOrgId = orgId ?? userId
    const tenant = await convex
      .query(api.tenants.getTenantByClerkOrgId, { clerkOrgId })
      .catch(() => null)

    if (!tenant) {
      const ctx = accessContextFromTenantRow(userId, clerkOrgId, null)
      const resolved = resolvePlatformConfig(ctx)
      return NextResponse.json({
        allowedAgents: resolved.fullPlatformAccess
          ? 'all'
          : ([...resolved.effectiveAllowedAgents] as string[]),
        features: resolved.effectiveFeatures,
        fullPlatformAccess: resolved.fullPlatformAccess,
        nicheId: resolved.nicheId,
      })
    }

    const row = await convex
      .query(api.tenantConfigs.getByTenantId, { tenantId: tenant._id })
      .catch(() => null)

    const base = tenantConfigFromConvexRow(row)
    const ctx = accessContextFromTenantRow(userId, clerkOrgId, base)
    const resolved = resolvePlatformConfig(ctx)

    return NextResponse.json({
      allowedAgents: resolved.fullPlatformAccess
        ? 'all'
        : ([...resolved.effectiveAllowedAgents] as string[]),
      features: resolved.effectiveFeatures,
      fullPlatformAccess: resolved.fullPlatformAccess,
      nicheId: resolved.nicheId,
    })
  } catch (e) {
    console.error('[effective-config]', e)
    return NextResponse.json(
      { error: 'Failed to resolve config' },
      { status: 500 }
    )
  }
}
