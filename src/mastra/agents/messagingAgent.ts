import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { MESSAGING_PROMPT } from '../prompts/messaging'
import type { ComposioProvider } from '@/types'

const MESSAGING_PROVIDERS: ComposioProvider[] = ['slack', 'microsoft-teams', 'discord']

export interface MessagingAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Messaging agent with Composio tools for Slack, Teams, Discord.
 */
export async function createMessagingAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace
): Promise<MessagingAgentResult> {
  const activeProviders = MESSAGING_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `messaging-${userId}`,
    name: 'messaging',
    instructions: MESSAGING_PROMPT,
    model: AgentModels.messaging(),
    workspace,
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}
