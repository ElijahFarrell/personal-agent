import type { TenantConfig } from '@/constants/featureGating'
import type { ResolvedPlatformConfig } from './types'

/** Merge resolver output into a TenantConfig shape for routes that use isAgentAllowed / isFeatureEnabled. */
export function tenantConfigForResolvedGates(
  base: TenantConfig,
  resolved: ResolvedPlatformConfig
): TenantConfig {
  return {
    ...base,
    features: resolved.effectiveFeatures,
    allowedAgents: resolved.fullPlatformAccess
      ? 'all'
      : ([...resolved.effectiveAllowedAgents] as string[]),
    /** True when env allowlists, tenant flag, or org allowlist grants full catalog. */
    fullPlatformAccess: resolved.fullPlatformAccess,
    nicheId: resolved.nicheId,
  }
}
