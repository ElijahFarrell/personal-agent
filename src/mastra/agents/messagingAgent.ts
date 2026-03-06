import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createSlackSendMessageTool } from '../tools/slackTools'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getNangoMCPToolsets } from '@/lib/nangoMcp'
import { MESSAGING_PROMPT } from '../prompts/messaging'

const MESSAGING_PROVIDERS = ['slack', 'microsoft-teams', 'discord'] as const

export interface MessagingAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Messaging agent with MCP tools for Teams/Discord and custom Slack send.
 */
export async function createMessagingAgent(
  userId: string,
  connectedProviders: string[]
): Promise<MessagingAgentResult> {
  const activeProviders = MESSAGING_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const toolsets =
    activeProviders.length > 0
      ? await getNangoMCPToolsets(userId, [...activeProviders])
      : {}

  const baseTools = {
    mem0Recall: createMem0RecallTool(userId),
    mem0Memorize: createMem0MemorizeTool(userId),
  }

  const agent = new Agent({
    id: `messaging-${userId}`,
    name: 'messaging',
    instructions: MESSAGING_PROMPT,
    model: AgentModels.messaging(),
    tools:
      connectedProviders.includes('slack')
        ? {
            ...baseTools,
            slackSendMessage: createSlackSendMessageTool(userId),
          }
        : baseTools,
  })

  return { agent, toolsets }
}
