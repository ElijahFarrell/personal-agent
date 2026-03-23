import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { getComposioToolsForProviders } from '@/lib/composio'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { ADS_CAMPAIGN_BUILDER_PROMPT } from '../prompts/adsCampaignBuilder'
import { ADS_AGENT_GENERATE_OPTS } from './adsAgentOptions'
import type { ComposioProvider } from '@/types'

const PROVIDERS: ComposioProvider[] = ['searchApi']

export interface CampaignBuilderAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
  generateOptions: typeof ADS_AGENT_GENERATE_OPTS
}

export async function createCampaignBuilderAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace
): Promise<CampaignBuilderAgentResult> {
  const active = PROVIDERS.filter((p) => connectedProviders.includes(p))
  const composioTools =
    active.length > 0 ? await getComposioToolsForProviders(userId, active) : {}

  const agent = new Agent({
    id: `campaign-builder-${userId}`,
    name: 'campaignBuilder',
    instructions: ADS_CAMPAIGN_BUILDER_PROMPT,
    model: AgentModels.adsIntelligence(),
    workspace,
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {}, generateOptions: ADS_AGENT_GENERATE_OPTS }
}
