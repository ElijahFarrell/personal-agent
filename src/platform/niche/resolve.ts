import { AGENT_IDS, type AgentId } from '@/constants/agents'
import { DEFAULT_CONFIG, type TenantConfig } from '@/constants/featureGating'
import { isOrgFullAccessAllowlisted, isUserFullAccessAllowlisted } from './full-access'
import { NICHE_PACKS } from './packs'
import type { AccessContext, NicheId, ResolvedPlatformConfig } from './types'

const ALL_AGENT_IDS = Object.values(AGENT_IDS) as AgentId[]

function allFeaturesTrue(features: TenantConfig['features']): TenantConfig['features'] {
  const out = { ...features }
  for (const k of Object.keys(out) as (keyof TenantConfig['features'])[]) {
    out[k] = true
  }
  return out
}

/**
 * True when env allowlists or tenant row grant full catalog (agents, features, workflows, skills).
 */
export function computeFullPlatformAccess(
  clerkUserId: string,
  clerkOrgId: string,
  tenantConfig: TenantConfig
): boolean {
  if (tenantConfig.fullPlatformAccess === true) return true
  if (isUserFullAccessAllowlisted(clerkUserId)) return true
  if (clerkOrgId && isOrgFullAccessAllowlisted(clerkOrgId)) return true
  return false
}

function nicheDefaultEnabledAgents(pack: (typeof NICHE_PACKS)[NicheId]): Set<AgentId> {
  const enabled = new Set<AgentId>()
  for (const id of ALL_AGENT_IDS) {
    const profile = pack.agentProfiles[id]
    const on = profile?.defaultEnabled ?? true
    if (on) enabled.add(id)
  }
  return enabled
}

function intersectWithTenantAgents(
  nicheSet: Set<AgentId>,
  allowedAgents: TenantConfig['allowedAgents']
): Set<AgentId> {
  if (allowedAgents === 'all') return nicheSet
  const allowed = new Set(allowedAgents as AgentId[])
  return new Set([...nicheSet].filter((id) => allowed.has(id)))
}

/**
 * Merge niche pack, tenant config, optional full-platform bypass, and env.
 */
export function resolvePlatformConfig(ctx: AccessContext): ResolvedPlatformConfig {
  const { clerkUserId, clerkOrgId, tenantConfig } = ctx
  const fullPlatformAccess = computeFullPlatformAccess(clerkUserId, clerkOrgId, tenantConfig)

  const nicheId: NicheId = tenantConfig.nicheId ?? 'generic'
  const pack = NICHE_PACKS[nicheId] ?? NICHE_PACKS.generic

  const effectiveFeatures = fullPlatformAccess
    ? allFeaturesTrue(tenantConfig.features)
    : tenantConfig.features

  let effectiveAllowedAgents: Set<AgentId>
  if (fullPlatformAccess) {
    effectiveAllowedAgents = new Set(ALL_AGENT_IDS)
  } else {
    const nicheEnabled = nicheDefaultEnabledAgents(pack)
    effectiveAllowedAgents = intersectWithTenantAgents(nicheEnabled, tenantConfig.allowedAgents)
  }

  const orchestratorContext = [
    pack.orchestratorContext,
    tenantConfig.nicheOverrides?.orchestratorAddendum,
  ]
    .filter(Boolean)
    .join('\n\n')

  let skillIndexGlobs: string[]
  if (fullPlatformAccess) {
    const globs = new Set<string>()
    for (const p of Object.values(NICHE_PACKS)) {
      for (const g of p.skillIndexGlobs) globs.add(g)
    }
    skillIndexGlobs = [...globs]
  } else {
    skillIndexGlobs = [...pack.skillIndexGlobs]
  }

  let workflowTemplateIds: string[]
  if (fullPlatformAccess) {
    const ids = new Set<string>()
    for (const p of Object.values(NICHE_PACKS)) {
      for (const t of p.workflowTemplateIds) ids.add(t)
    }
    workflowTemplateIds = [...ids]
  } else {
    workflowTemplateIds = [...pack.workflowTemplateIds]
  }

  return {
    nicheId,
    fullPlatformAccess,
    effectiveAllowedAgents,
    effectiveFeatures,
    orchestratorContext,
    skillIndexGlobs,
    workflowTemplateIds,
    nicheOverrides: tenantConfig.nicheOverrides,
  }
}

/** Build AccessContext from Clerk ids and a raw Convex config row (or null). */
export function accessContextFromTenantRow(
  clerkUserId: string,
  clerkOrgId: string,
  row: TenantConfig | null
): AccessContext {
  const base = row
    ? {
        allowedAgents: row.allowedAgents,
        allowedIntegrations: row.allowedIntegrations,
        features: { ...DEFAULT_CONFIG.features, ...row.features },
        limits: { ...DEFAULT_CONFIG.limits, ...row.limits },
        billingModel: row.billingModel,
        nicheId: row.nicheId,
        nicheOverrides: row.nicheOverrides,
        fullPlatformAccess: row.fullPlatformAccess,
      }
    : DEFAULT_CONFIG

  return {
    clerkUserId,
    clerkOrgId,
    tenantConfig: base,
  }
}
