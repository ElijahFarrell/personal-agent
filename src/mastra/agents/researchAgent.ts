import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { webSearchTool } from '../tools/webSearchTool'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { RESEARCH_PROMPT } from '../prompts'

/** Factory creates a research agent scoped to a user. */
export function createResearchAgent(userId: string) {
  return new Agent({
    id: `research-${userId}`,
    name: 'research',
    instructions: RESEARCH_PROMPT,
    model: AgentModels.research(),
    tools: {
      webSearch: webSearchTool,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
