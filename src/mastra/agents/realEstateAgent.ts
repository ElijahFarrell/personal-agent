import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getNangoMCPToolsets } from '@/lib/nangoMcp'
import { REAL_ESTATE_PROMPT } from '../prompts/realEstate'

const REAL_ESTATE_PROVIDERS = ['follow-up-boss', 'calendly'] as const

export interface RealEstateAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Real Estate agent with MCP tools for Follow Up Boss and Calendly.
 */
export async function createRealEstateAgent(
  userId: string,
  connectedProviders: string[]
): Promise<RealEstateAgentResult> {
  const activeProviders = REAL_ESTATE_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const toolsets =
    activeProviders.length > 0
      ? await getNangoMCPToolsets(userId, [...activeProviders])
      : {}

  const agent = new Agent({
    id: `realEstate-${userId}`,
    name: 'realEstate',
    instructions: REAL_ESTATE_PROMPT,
    model: AgentModels.realEstate(),
    tools: {
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets }
}
