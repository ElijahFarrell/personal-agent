/**
 * Feature gating helpers — pure functions for checking org config.
 * Used on both client and server.
 */

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
}

export type FeatureKey = keyof TenantConfigFeatures

export function isAgentAllowed(config: TenantConfig, agentId: string): boolean {
  if (config.allowedAgents === 'all') return true
  return config.allowedAgents.includes(agentId)
}

export function isIntegrationAllowed(config: TenantConfig, provider: string): boolean {
  if (config.allowedIntegrations === 'all') return true
  return config.allowedIntegrations.includes(provider)
}

export function isFeatureEnabled(
  config: TenantConfig,
  feature: FeatureKey
): boolean {
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
