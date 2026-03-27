/**
 * Feature gating helpers — pure functions for checking org config.
 * Used on both client and server.
 */

/** Primary vertical for niche packs (Convex + resolver). */
export type NicheId = 'generic' | 'real_estate'

export interface NicheOverrides {
  orchestratorAddendum?: string
}

export interface TenantConfigFeatures {
  customWorkflows: boolean
  deepResearch: boolean
  outreachCampaigns: boolean
  prospectTable: boolean
  exaWebsets: boolean
  crmSync: boolean
  customSkills: boolean
  voiceMode: boolean
  workflowBuilder: boolean
  scheduledTasks: boolean
  videoStudio: boolean
  unifiedInbox: boolean
  eventTriggers: boolean
}

export interface TenantConfigLimits {
  maxMembers: number
  maxProspectsPerMonth: number
  maxWorkflows: number
  maxSchedules: number
  maxSkills: number
  monthlyCredits: number
  maxVideoGenerationsPerMonth: number
  maxInboxSyncPerDay: number
}

export interface TenantConfig {
  allowedAgents: 'all' | string[]
  allowedIntegrations: 'all' | string[]
  features: TenantConfigFeatures
  limits: TenantConfigLimits
  billingModel?: string
  nicheId?: NicheId
  nicheOverrides?: NicheOverrides
  /** Convex flag: org sees full agent/feature/workflow surface (like env allowlists). */
  fullPlatformAccess?: boolean
}

/** Fallback when no tenantConfigs row exists (free-tier equivalent). */
export const DEFAULT_CONFIG: TenantConfig = {
  allowedAgents: [
    'email',
    'research',
    'calendar',
    'content',
    'metaAds',
    'adsScraper',
    'adAnalyzer',
    'campaignBuilder',
  ],
  allowedIntegrations: ['gmail', 'google-calendar', 'apollo', 'outlook', 'metaAds', 'searchApi'],
  features: {
    customWorkflows: false,
    deepResearch: false,
    outreachCampaigns: false,
    prospectTable: false,
    exaWebsets: false,
    crmSync: false,
    customSkills: false,
    voiceMode: false,
    workflowBuilder: false,
    scheduledTasks: false,
    videoStudio: false,
    unifiedInbox: false,
    eventTriggers: false,
  },
  limits: {
    maxMembers: 1,
    maxProspectsPerMonth: 10,
    maxWorkflows: 1,
    maxSchedules: 1,
    maxSkills: 5,
    monthlyCredits: 10,
    maxVideoGenerationsPerMonth: 20,
    maxInboxSyncPerDay: 50,
  },
  billingModel: 'friend',
  nicheId: 'generic',
  nicheOverrides: undefined,
  fullPlatformAccess: undefined,
}

export type FeatureKey = keyof TenantConfigFeatures

/** For full-platform / builder sessions — every feature gate passes. */
export function withAllFeaturesEnabled(
  features: TenantConfigFeatures
): TenantConfigFeatures {
  const out = { ...features }
  for (const k of Object.keys(out) as (keyof TenantConfigFeatures)[]) {
    out[k] = true
  }
  return out
}

export function isAgentAllowed(config: TenantConfig, agentId: string): boolean {
  if (config.fullPlatformAccess === true) return true
  if (config.allowedAgents === 'all') return true
  return config.allowedAgents.includes(agentId)
}

/**
 * Agent allowlist after niche + tenant resolution (server-side).
 */
export function isAgentAllowedResolved(
  resolved: { fullPlatformAccess: boolean; effectiveAllowedAgents: Set<string> },
  agentId: string
): boolean {
  if (resolved.fullPlatformAccess) return true
  return resolved.effectiveAllowedAgents.has(agentId)
}

export function isIntegrationAllowed(config: TenantConfig, provider: string): boolean {
  if (config.fullPlatformAccess === true) return true
  if (config.allowedIntegrations === 'all') return true
  return config.allowedIntegrations.includes(provider)
}

export function isFeatureEnabled(
  config: TenantConfig,
  feature: FeatureKey
): boolean {
  if (config.fullPlatformAccess === true) return true
  return config.features[feature] === true
}

/**
 * -1 means unlimited. Returns true if currentValue is within the limit.
 */
export function isWithinLimit(
  config: TenantConfig,
  limitKey: keyof TenantConfigLimits,
  currentValue: number
): boolean {
  const limit = config.limits[limitKey]
  if (limit < 0) return true
  return currentValue <= limit
}
