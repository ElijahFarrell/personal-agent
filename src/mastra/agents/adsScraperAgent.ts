import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { getComposioToolsForProviders } from '@/lib/composio'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { ADS_SCRAPER_PROMPT } from '../prompts/adsScraper'
import { ADS_AGENT_GENERATE_OPTS } from './adsAgentOptions'
import type { ComposioProvider } from '@/types'
import { AGENT_META, getAgentSchemas } from './schemas'

export const ADS_SCRAPER_AGENT_SCHEMAS = getAgentSchemas('adsScraper')

const PROVIDERS: ComposioProvider[] = ['searchApi']

export interface AdsScraperAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
  generateOptions: typeof ADS_AGENT_GENERATE_OPTS
}

export async function createAdsScraperAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace
): Promise<AdsScraperAgentResult> {
  const active = PROVIDERS.filter((p) => connectedProviders.includes(p))
  const composioTools =
    active.length > 0 ? await getComposioToolsForProviders(userId, active) : {}

  const agent = new Agent({
    id: `ads-scraper-${userId}`,
    name: 'adsScraper',
    description: AGENT_META.adsScraper.description,
    instructions: ADS_SCRAPER_PROMPT,
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
