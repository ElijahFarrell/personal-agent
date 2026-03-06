import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createNotionCreatePageTool } from '../tools/notionTools'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getNangoMCPToolsets } from '@/lib/nangoMcp'
import { DOCS_PROMPT } from '../prompts/docs'

const DOCS_PROVIDERS = ['google-docs', 'google-sheet', 'airtable', 'notion'] as const

export interface DocsAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Docs agent with MCP tools for Google Docs/Sheets/Airtable and custom Notion create.
 */
export async function createDocsAgent(
  userId: string,
  connectedProviders: string[]
): Promise<DocsAgentResult> {
  const activeProviders = DOCS_PROVIDERS.filter((p) =>
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
    id: `docs-${userId}`,
    name: 'docs',
    instructions: DOCS_PROMPT,
    model: AgentModels.docs(),
    tools:
      connectedProviders.includes('notion')
        ? {
            ...baseTools,
            notionCreatePage: createNotionCreatePageTool(userId),
          }
        : baseTools,
  })

  return { agent, toolsets }
}
