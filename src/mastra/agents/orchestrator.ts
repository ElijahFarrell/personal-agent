import { gateway } from 'ai'
import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createAgentTools } from '../tools/agentTools'
import { buildOrchestratorPrompt } from '../prompts'
import { createVoice } from '../voice'
import type { SkillPreference } from '@/services/skillsService'
import type { SkillLookupScope } from '@/services/skillsService'

export interface OrchestratorSkillContext {
  scope: SkillLookupScope
  preferences: SkillPreference[]
}

/**
 * Factory creates an orchestrator agent scoped to a specific user.
 * Accepts optional per-agent custom instructions from the user's dashboard settings.
 * When skillContext is provided, sub-agents receive skills and context for progressive discovery.
 */
export function createOrchestratorAgent(
  userId: string,
  tenantId: string,
  agentInstructions?: Record<string, string>,
  connectedProviders: string[] = [],
  modelId?: string,
  skillContext?: OrchestratorSkillContext
) {
  const agentTools = createAgentTools(userId, tenantId, agentInstructions, connectedProviders, skillContext)

  const baseInstructions = buildOrchestratorPrompt(userId, tenantId, connectedProviders)
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
    tools: {
      ...agentTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
