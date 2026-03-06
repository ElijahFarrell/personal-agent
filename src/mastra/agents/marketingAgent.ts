import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getNangoMCPToolsets } from '@/lib/nangoMcp'
import { MARKETING_PROMPT } from '../prompts/marketing'

const MARKETING_PROVIDERS = ['mailchimp'] as const

export interface MarketingAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Marketing agent with MCP tools for Mailchimp.
 */
export async function createMarketingAgent(
  userId: string,
  connectedProviders: string[]
): Promise<MarketingAgentResult> {
  const activeProviders = MARKETING_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const toolsets =
    activeProviders.length > 0
      ? await getNangoMCPToolsets(userId, [...activeProviders])
      : {}

  const agent = new Agent({
    id: `marketing-${userId}`,
    name: 'marketing',
    instructions: MARKETING_PROMPT,
    model: AgentModels.marketing(),
    tools: {
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets }
}
