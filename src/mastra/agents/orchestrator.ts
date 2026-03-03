import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createAgentTools } from '../tools/agentTools'
import { buildOrchestratorPrompt } from '../prompts'
import { createVoice } from '../voice'

/**
 * Factory creates an orchestrator agent scoped to a specific user.
 * Accepts optional per-agent custom instructions from the user's dashboard settings.
 */
export function createOrchestratorAgent(
  userId: string,
  tenantId: string,
  agentInstructions?: Record<string, string>,
  connectedProviders: string[] = []
) {
  const agentTools = createAgentTools(userId, tenantId, agentInstructions)

  const baseInstructions = buildOrchestratorPrompt(userId, tenantId, connectedProviders)
  const orchestratorCustom = agentInstructions?.orchestrator?.trim()
  const instructions = orchestratorCustom
    ? `${baseInstructions}\n\n## Additional Instructions\n${orchestratorCustom}`
    : baseInstructions

  return new Agent({
    id: `orchestrator-${userId}`,
    name: 'orchestrator',
    instructions,
    model: AgentModels.orchestrator(),
    voice: createVoice(),
    tools: {
      ...agentTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
