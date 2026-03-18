import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { FINANCE_PROMPT } from '../prompts/finance'
import type { ComposioProvider } from '@/types'

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
  connectedProviders: string[]
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
    instructions: FINANCE_PROMPT,
    model: AgentModels.finance(),
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}
