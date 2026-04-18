import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { FINANCE_PROMPT } from '../prompts/finance'
import type { ComposioProvider } from '@/types'
import { AGENT_META, getAgentSchemas } from './schemas'

export const FINANCE_AGENT_SCHEMAS = getAgentSchemas('finance')

const FINANCE_PROVIDERS: ComposioProvider[] = ['stripe', 'quickbooks']

export interface FinanceAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Finance agent with Composio tools for Stripe and QuickBooks.
 */
export async function createFinanceAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace
): Promise<FinanceAgentResult> {
  const activeProviders = FINANCE_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `finance-${userId}`,
    name: 'finance',
    description: AGENT_META.finance.description,
    instructions: FINANCE_PROMPT,
    model: AgentModels.finance(),
    workspace,
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}
