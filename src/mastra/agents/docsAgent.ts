import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { DOCS_PROMPT } from '../prompts/docs'
import type { ComposioProvider } from '@/types'
import { AGENT_META, getAgentSchemas } from './schemas'

export const DOCS_AGENT_SCHEMAS = getAgentSchemas('docs')

const DOCS_PROVIDERS: ComposioProvider[] = ['google-docs', 'google-sheet', 'airtable', 'notion']

export interface DocsAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Docs agent with Composio tools for Google Docs, Sheets, Airtable, Notion.
 */
export async function createDocsAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace
): Promise<DocsAgentResult> {
  const activeProviders = DOCS_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `docs-${userId}`,
    name: 'docs',
    description: AGENT_META.docs.description,
    instructions: DOCS_PROMPT,
    model: AgentModels.docs(),
    workspace,
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}
