/**
 * Lead agent — Apollo + Outlook (Composio) + Exa Websets (SDR).
 * Handles: find leads, research, personalize, add to sequence.
 */
import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { Composio } from '@composio/core'
import { MastraProvider } from '@composio/mastra'
import { config } from '@/lib/config'
import { getSDRTools, createSDRAgent } from './sdrAgent'
import { webSearchTool } from '../tools/webSearchTool'
import { AgentModels } from '@/constants/models'
import { getComposioConnectionStatus } from '@/lib/composio'
import { LEAD_PROMPT } from '../prompts/lead'

/**
 * Creates a Lead agent with Exa (SDR) tools and optionally Composio Apollo + Outlook tools.
 * Fetches Composio tools when user has apollo or outlook connected.
 */
export async function createLeadAgent(
  userId: string,
  tenantId: string,
  workspace?: Workspace
): Promise<Agent> {
  const baseTools = { ...getSDRTools(userId, tenantId), webSearch: webSearchTool }

  if (!config.composio.apiKey) {
    return new Agent({
      id: `lead-${userId}`,
      name: 'lead',
      instructions: LEAD_PROMPT,
      model: AgentModels.content(),
      workspace,
      tools: baseTools,
    })
  }

  const status = await getComposioConnectionStatus(userId)
  const hasApollo = status.apollo
  const hasOutlook = status.outlook

  if (!hasApollo && !hasOutlook) {
    return new Agent({
      id: `lead-${userId}`,
      name: 'lead',
      instructions: LEAD_PROMPT,
      model: AgentModels.content(),
      workspace,
      tools: baseTools,
    })
  }

  const toolkits: string[] = []
  if (hasApollo) toolkits.push('APOLLO')
  if (hasOutlook) toolkits.push('OUTLOOK')

  const composio = new Composio({
    apiKey: config.composio.apiKey,
    provider: new MastraProvider(),
  })

  const session = await composio.create(userId, {
    manageConnections: false,
    toolkits,
  })

  const composioTools = await session.tools()
  const mergedTools = { ...baseTools, ...(composioTools as Record<string, unknown>) }

  return new Agent({
    id: `lead-${userId}`,
    name: 'lead',
    instructions: LEAD_PROMPT,
    model: AgentModels.content(),
    workspace,
    tools: mergedTools,
  })
}
