import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createNotionSearchTool, createNotionReadPageTool, createNotionCreatePageTool } from '../tools/notionTools'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { NOTION_PROMPT } from '../prompts/notion'

export function createNotionAgent(userId: string) {
  return new Agent({
    id: `notion-${userId}`,
    name: 'notion',
    instructions: NOTION_PROMPT,
    model: AgentModels.notion(),
    tools: {
      notionSearch: createNotionSearchTool(userId),
      notionReadPage: createNotionReadPageTool(userId),
      notionCreatePage: createNotionCreatePageTool(userId),
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
