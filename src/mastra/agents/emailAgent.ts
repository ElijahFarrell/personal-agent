import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { createSubAgentMemory } from '../memory'
import { EMAIL_PROMPT } from '../prompts'
import type { ComposioProvider } from '@/types'
import { AGENT_META, getAgentSchemas } from './schemas'

export const EMAIL_AGENT_SCHEMAS = getAgentSchemas('email')

const EMAIL_PROVIDERS: ComposioProvider[] = ['gmail', 'outlook']

export interface EmailAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Email agent with Composio tools for Gmail and Outlook.
 *
 * When `tenantId` is provided, every Composio tool is routed through the MCP
 * elicitation gate — Gmail/Outlook SEND/DELETE calls then short-circuit on
 * the first invocation and wait for explicit user approval before firing.
 */
export async function createEmailAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace,
  tenantId?: string
): Promise<EmailAgentResult> {
  const activeProviders = EMAIL_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders, {
          elicit: tenantId ? { tenantId, agentId: 'agent-email' } : undefined,
        })
      : {}

  const agent = new Agent({
    id: `email-${userId}`,
    name: 'email',
    description: AGENT_META.email.description,
    instructions: EMAIL_PROMPT,
    model: AgentModels.email(),
    workspace,
    memory: createSubAgentMemory('email'),
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
    description: AGENT_META.email.description,
    instructions: EMAIL_PROMPT,
    model: AgentModels.email(),
    memory: createSubAgentMemory('email'),
    tools: {
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
