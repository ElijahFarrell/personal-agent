/**
 * Lead agent — Apollo + Outlook (Composio) + Exa Websets (SDR).
 * Handles: find leads, research, personalize, add to sequence.
 *
 * Tools are pulled via the internal MCP client so this factory doesn't need
 * to know about the SDR agent's internals or reach into Composio directly.
 */
import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { webSearchTool } from '../tools/webSearchTool'
import { AgentModels } from '@/constants/models'
import { createSubAgentMemory } from '../memory'
import { createInternalMcpClient } from '../mcp/internalClient'
import { LEAD_PROMPT } from '../prompts/lead'
import { AGENT_META, getAgentSchemas } from './schemas'

export const LEAD_AGENT_SCHEMAS = getAgentSchemas('lead')

/**
 * Creates a Lead agent with Exa (SDR) tools and optionally Composio Apollo +
 * Outlook tools. Composio toolkits that are not connected are silently
 * omitted by the MCP client, so no feature-detection or provider status
 * check is needed here.
 */
export async function createLeadAgent(
  userId: string,
  tenantId: string,
  workspace?: Workspace
): Promise<Agent> {
  const mcp = createInternalMcpClient({ userId, tenantId })
  const mcpTools = await mcp.listTools({
    include: ['exa', 'apollo', 'outlook'],
  })

  const tools = {
    ...(mcpTools as Record<string, unknown>),
    webSearch: webSearchTool,
  }

  return new Agent({
    id: `lead-${userId}`,
    name: 'lead',
    description: AGENT_META.lead.description,
    instructions: LEAD_PROMPT,
    model: AgentModels.content(),
    workspace,
    memory: createSubAgentMemory('lead'),
    tools,
  })
}
