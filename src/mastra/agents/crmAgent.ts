import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { createSubAgentMemory } from '../memory'
import { CRM_PROMPT } from '../prompts/crm'
import type { ComposioProvider } from '@/types'
import { AGENT_META, getAgentSchemas } from './schemas'

export const CRM_AGENT_SCHEMAS = getAgentSchemas('crm')

const CRM_PROVIDERS: ComposioProvider[] = [
  'hubspot',
  'salesforce',
  'zoho-crm',
  'pipedrive',
]

export interface CrmAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the CRM agent with Composio tools for HubSpot, Salesforce, Zoho CRM, Pipedrive.
 *
 * When `tenantId` is provided, bulk imports and record mutations are routed
 * through the MCP elicitation gate and require explicit user approval before
 * firing.
 */
export async function createCrmAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace,
  tenantId?: string
): Promise<CrmAgentResult> {
  const activeProviders = CRM_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders, {
          elicit: tenantId ? { tenantId, agentId: 'agent-crm' } : undefined,
        })
      : {}

  const agent = new Agent({
    id: `crm-${userId}`,
    name: 'crm',
    description: AGENT_META.crm.description,
    instructions: CRM_PROMPT,
    model: AgentModels.crm(),
    workspace,
    memory: createSubAgentMemory('crm'),
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}
