import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { PROJECT_PROMPT } from '../prompts/project'
import type { ComposioProvider } from '@/types'

const PROJECT_PROVIDERS: ComposioProvider[] = ['asana', 'monday']

export interface ProjectAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Project agent with Composio tools for Asana and Monday.com.
 */
export async function createProjectAgent(
  userId: string,
  connectedProviders: string[],
  workspace?: Workspace
): Promise<ProjectAgentResult> {
  const activeProviders = PROJECT_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `project-${userId}`,
    name: 'project',
    instructions: PROJECT_PROMPT,
    model: AgentModels.project(),
    workspace,
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}
