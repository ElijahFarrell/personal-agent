import type { Doc } from '@convex/_generated/dataModel'
import {
  DEFAULT_CONFIG,
  type TenantConfig,
} from '@/constants/featureGating'

/** Map a Convex tenantConfigs document (or null) into {@link TenantConfig}. */
export function tenantConfigFromConvexRow(
  row: Doc<'tenantConfigs'> | null
): TenantConfig {
  if (!row) return DEFAULT_CONFIG
  return {
    allowedAgents: row.allowedAgents,
    allowedIntegrations: row.allowedIntegrations,
    features: { ...DEFAULT_CONFIG.features, ...row.features },
    limits: { ...DEFAULT_CONFIG.limits, ...row.limits },
    billingModel: row.billingModel,
    nicheId: row.nicheId ?? 'generic',
    nicheOverrides: row.nicheOverrides,
    fullPlatformAccess: row.fullPlatformAccess,
  }
}
