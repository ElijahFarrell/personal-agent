import { gateway } from 'ai'
import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createAgentTools } from '../tools/agentTools'
import { buildOrchestratorPrompt } from '../prompts'
import { createVoice } from '../voice'
import { createWorkspaceForTenant } from '../createWorkspaceForTenant'
import { adsIntelligenceWorkflow } from '../workflows/adsIntelligencePipeline'
import type { ResolvedPlatformConfig } from '@/platform/niche/types'
import type { AgentId } from '@/constants/agents'

function shouldIncludeAdsWorkflow(
  resolved: ResolvedPlatformConfig | undefined
): boolean {
  if (!resolved) return true
  if (resolved.fullPlatformAccess) return true
  const ads: AgentId[] = ['adsScraper', 'adAnalyzer', 'campaignBuilder']
  return ads.some((id) => resolved.effectiveAllowedAgents.has(id))
}

export interface OrchestratorSkillScope {
  tenantId: string
  userId: string
}

/**
 * Factory creates an orchestrator agent scoped to a specific user.
 * When skillScope is provided, creates a tenant-scoped workspace so the agent
 * and all sub-agents get skill_search, skill_read, and skill tools for progressive loading.
 */
export async function createOrchestratorAgent(
  userId: string,
  tenantId: string,
  agentInstructions?: Record<string, string>,
  connectedProviders: string[] = [],
  modelId?: string,
  skillScope?: OrchestratorSkillScope,
  platformResolved?: ResolvedPlatformConfig
) {
  const workspace = skillScope
    ? await createWorkspaceForTenant(
        skillScope.tenantId,
        skillScope.userId,
        platformResolved
      )
    : undefined

  const agentTools = createAgentTools(
    userId,
    tenantId,
    agentInstructions,
    connectedProviders,
    workspace,
    platformResolved
  )

  const baseInstructions = buildOrchestratorPrompt(
    userId,
    tenantId,
    connectedProviders,
    platformResolved
  )
  const orchestratorCustom = agentInstructions?.orchestrator?.trim()
  const instructions = orchestratorCustom
    ? `${baseInstructions}\n\n## Additional Instructions\n${orchestratorCustom}`
    : baseInstructions

  const model = modelId ? gateway(modelId) : AgentModels.orchestrator()

  return new Agent({
    id: `orchestrator-${userId}`,
    name: 'orchestrator',
    instructions,
    model,
    voice: createVoice(),
    workspace: workspace as Workspace | undefined,
    tools: {
      ...agentTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
    workflows: shouldIncludeAdsWorkflow(platformResolved)
      ? { adsIntelligence: adsIntelligenceWorkflow }
      : {},
  })
}
