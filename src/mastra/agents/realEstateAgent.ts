import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { REAL_ESTATE_PROMPT } from '../prompts/realEstate'
import type { ComposioProvider } from '@/types'

const REAL_ESTATE_PROVIDERS: ComposioProvider[] = ['follow-up-boss', 'calendly']

export interface RealEstateAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Real Estate agent with Composio tools for Calendly.
 */
export async function createRealEstateAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace
): Promise<RealEstateAgentResult> {
  const activeProviders = REAL_ESTATE_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `realEstate-${userId}`,
    name: 'realEstate',
    instructions: REAL_ESTATE_PROMPT,
    model: AgentModels.realEstate(),
    workspace,
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}
