import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { webSearchTool } from '../tools/webSearchTool'
import { CONTENT_PROMPT } from '../prompts'

/**
 * Factory creates a Content agent scoped to a user for memory isolation.
 */
export function createContentAgent(userId: string): Agent {
  return new Agent({
    id: 'content',
    name: 'content',
    instructions: CONTENT_PROMPT,
    model: AgentModels.content(),
    tools: {
      webSearch: webSearchTool,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
