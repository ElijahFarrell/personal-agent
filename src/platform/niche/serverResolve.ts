import type { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { tenantConfigFromConvexRow } from '@/lib/convexTenantConfig'
import type { ResolvedPlatformConfig } from './types'
import { accessContextFromTenantRow, resolvePlatformConfig } from './resolve'

/**
 * Load tenant row + config from Convex and run full resolver (includes env allowlists).
 */
export async function resolvePlatformForClerkUser(
  convex: ConvexHttpClient,
  clerkUserId: string,
  convexTenantId: Id<'tenants'>
): Promise<ResolvedPlatformConfig> {
  const tenantDoc = await convex
    .query(api.tenants.getTenantById, { tenantId: convexTenantId })
    .catch(() => null)
  const clerkOrgId = tenantDoc?.clerkOrgId ?? clerkUserId

  const row = await convex
    .query(api.tenantConfigs.getByTenantId, { tenantId: convexTenantId })
    .catch(() => null)

  const base = tenantConfigFromConvexRow(row)
  return resolvePlatformConfig(
    accessContextFromTenantRow(clerkUserId, clerkOrgId, base)
  )
}
