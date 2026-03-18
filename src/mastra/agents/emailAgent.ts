import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { EMAIL_PROMPT } from '../prompts'
import type { ComposioProvider } from '@/types'

const EMAIL_PROVIDERS: ComposioProvider[] = ['gmail', 'outlook']

export interface EmailAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Email agent with Composio tools for Gmail and Outlook.
 */
export async function createEmailAgent(
  userId: string,
  connectedProviders: string[]
): Promise<EmailAgentResult> {
  const activeProviders = EMAIL_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `email-${userId}`,
    name: 'email',
    instructions: EMAIL_PROMPT,
    model: AgentModels.email(),
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}

/** Sync factory for createAllAgents — returns agent with mem0 only (Composio tools require async + connectedProviders). */
export function createEmailAgentSync(userId: string): Agent {
  return new Agent({
    id: `email-${userId}`,
    name: 'email',
    instructions: EMAIL_PROMPT,
    model: AgentModels.email(),
    tools: {
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
