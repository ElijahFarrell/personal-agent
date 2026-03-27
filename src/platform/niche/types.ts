import type { AgentId } from '@/constants/agents'
import type {
  NicheId,
  NicheOverrides,
  TenantConfig,
  TenantConfigFeatures,
} from '@/constants/featureGating'

export type { NicheId, NicheOverrides }

/** Per-agent defaults inside a niche (enablement relative to catalog). */
export interface NicheAgentProfile {
  defaultEnabled: boolean
  /** Appended to base agent instructions when building prompts. */
  promptFragments?: string[]
  /** Extra line for the orchestrator delegation tool description. */
  delegateDescriptionSuffix?: string
}

export interface NichePack {
  id: NicheId
  label: string
  /** Injected into orchestrator prompt (domain vocabulary, delegation hints). */
  orchestratorContext: string
  /** Relative to repo root; unioned into workspace autoIndexPaths. */
  skillIndexGlobs: string[]
  /** Workflow template IDs for builder ordering (v1 may be empty). */
  workflowTemplateIds: string[]
  agentProfiles: Partial<Record<AgentId, NicheAgentProfile>>
}

export interface AccessContext {
  clerkUserId: string
  clerkOrgId: string
  tenantConfig: TenantConfig
}

export interface ResolvedPlatformConfig {
  nicheId: NicheId
  fullPlatformAccess: boolean
  /** Agent ids the user may invoke (delegate tools + direct chat targets). */
  effectiveAllowedAgents: Set<AgentId>
  /** Feature flags after full-access merge. */
  effectiveFeatures: TenantConfigFeatures
  orchestratorContext: string
  skillIndexGlobs: string[]
  workflowTemplateIds: string[]
  nicheOverrides?: NicheOverrides
}
