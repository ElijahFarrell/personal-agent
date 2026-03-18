import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { CRM_PROMPT } from '../prompts/crm'
import type { ComposioProvider } from '@/types'

const CRM_PROVIDERS: ComposioProvider[] = ['hubspot', 'salesforce', 'zoho-crm']

export interface CrmAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the CRM agent with Composio tools for HubSpot, Salesforce, Zoho CRM.
 */
export async function createCrmAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace
): Promise<CrmAgentResult> {
  const activeProviders = CRM_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `crm-${userId}`,
    name: 'crm',
    instructions: CRM_PROMPT,
    model: AgentModels.crm(),
    workspace,
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}
