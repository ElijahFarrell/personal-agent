import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { webSearchTool } from '../tools/webSearchTool'
import { deepSearchTool } from '../tools/deepSearchTool'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { RESEARCH_PROMPT } from '../prompts'

/** Factory creates a research agent scoped to a user. */
export function createResearchAgent(userId: string, workspace?: Workspace) {
  return new Agent({
    id: `research-${userId}`,
    name: 'research',
    instructions: RESEARCH_PROMPT,
    model: AgentModels.research(),
    workspace,
    tools: {
      webSearch: webSearchTool,
      deepSearch: deepSearchTool,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
