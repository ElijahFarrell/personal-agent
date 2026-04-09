import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Clerk org id (or personal key) used in Qdrant metadata — must match `getTenantContext().tenantId`.
 */
export async function qdrantTenantKeyFromConvexTenantId(
  tenantId: Id<'tenants'>
): Promise<string> {
  const row = await convex.query(api.tenants.getTenantById, { tenantId })
  return row?.clerkOrgId ?? String(tenantId)
}
