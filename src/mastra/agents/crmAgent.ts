import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getNangoMCPToolsets } from '@/lib/nangoMcp'
import { CRM_PROMPT } from '../prompts/crm'

const CRM_PROVIDERS = ['hubspot', 'salesforce', 'pipedrive', 'zoho-crm'] as const

export interface CrmAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the CRM agent with MCP tools for connected CRM integrations.
 * Returns both the agent and toolsets — pass toolsets to agent.generate(task, { toolsets }).
 */
export async function createCrmAgent(
  userId: string,
  connectedProviders: string[]
): Promise<CrmAgentResult> {
  const activeCrmProviders = CRM_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const toolsets =
    activeCrmProviders.length > 0
      ? await getNangoMCPToolsets(userId, [...activeCrmProviders])
      : {}

  const agent = new Agent({
    id: `crm-${userId}`,
    name: 'crm',
    instructions: CRM_PROMPT,
    model: AgentModels.crm(),
    tools: {
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets }
}
