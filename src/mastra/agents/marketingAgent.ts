import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { MARKETING_PROMPT } from '../prompts/marketing'
import type { ComposioProvider } from '@/types'

const MARKETING_PROVIDERS: ComposioProvider[] = ['mailchimp', 'lemlist']

export interface MarketingAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Marketing agent with Composio tools for Mailchimp and Lemlist.
 */
export async function createMarketingAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace
): Promise<MarketingAgentResult> {
  const activeProviders = MARKETING_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `marketing-${userId}`,
    name: 'marketing',
    instructions: MARKETING_PROMPT,
    model: AgentModels.marketing(),
    workspace,
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}
