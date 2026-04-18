import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { NOTION_PROMPT } from '../prompts/notion'
import type { ComposioProvider } from '@/types'
import { AGENT_META, getAgentSchemas } from './schemas'

export const NOTION_AGENT_SCHEMAS = getAgentSchemas('notion')

const NOTION_PROVIDERS: ComposioProvider[] = ['notion']

export interface NotionAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Notion agent with Composio tools.
 */
export async function createNotionAgent(
  userId: string,
  connectedProviders: string[]
): Promise<NotionAgentResult> {
  const activeProviders = NOTION_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `notion-${userId}`,
    name: 'notion',
    description: AGENT_META.notion.description,
    instructions: NOTION_PROMPT,
    model: AgentModels.notion(),
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}

/** Sync factory for createAllAgents — returns agent with mem0 only. */
export function createNotionAgentSync(userId: string): Agent {
  return new Agent({
    id: `notion-${userId}`,
    name: 'notion',
    description: AGENT_META.notion.description,
    instructions: NOTION_PROMPT,
    model: AgentModels.notion(),
    tools: {
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
