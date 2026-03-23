import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { META_ADS_PROMPT } from '../prompts/metaAds'
import type { ComposioProvider } from '@/types'

const META_ADS_PROVIDERS: ComposioProvider[] = ['metaAds']

export interface MetaAdsAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

export async function createMetaAdsAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace
): Promise<MetaAdsAgentResult> {
  const activeProviders = META_ADS_PROVIDERS.filter((p) => connectedProviders.includes(p))
  const composioTools =
    activeProviders.length > 0 ? await getComposioToolsForProviders(userId, activeProviders) : {}

  const agent = new Agent({
    id: `metaAds-${userId}`,
    name: 'metaAds',
    instructions: META_ADS_PROMPT,
    model: AgentModels.metaAds(),
    workspace,
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}
