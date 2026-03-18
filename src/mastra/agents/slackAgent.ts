import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { SLACK_PROMPT } from '../prompts/slack'
import type { ComposioProvider } from '@/types'

const SLACK_PROVIDERS: ComposioProvider[] = ['slack']

export interface SlackAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Slack agent with Composio tools.
 */
export async function createSlackAgent(
  userId: string,
  connectedProviders: string[]
): Promise<SlackAgentResult> {
  const activeProviders = SLACK_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `slack-${userId}`,
    name: 'slack',
    instructions: SLACK_PROMPT,
    model: AgentModels.slack(),
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}

/** Sync factory for createAllAgents — returns agent with mem0 only. */
export function createSlackAgentSync(userId: string): Agent {
  return new Agent({
    id: `slack-${userId}`,
    name: 'slack',
    instructions: SLACK_PROMPT,
    model: AgentModels.slack(),
    tools: {
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
