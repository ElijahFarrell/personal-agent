import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { webSearchTool } from '../tools/webSearchTool'
import {
  createContentDraftTool,
  createListContentDraftsTool,
  type ContentDraftScope,
} from '../tools/contentDraftTools'
import { CONTENT_PROMPT } from '../prompts'

/**
 * Factory creates a Content agent scoped to a user for memory isolation.
 * When scope is provided, adds createContentDraft and listContentDrafts tools.
 */
export function createContentAgent(
  userId: string,
  scope?: ContentDraftScope
): Agent {
  const tools = scope
    ? {
        webSearch: webSearchTool,
        mem0Recall: createMem0RecallTool(userId),
        mem0Memorize: createMem0MemorizeTool(userId),
        createContentDraft: createContentDraftTool(scope),
        listContentDrafts: createListContentDraftsTool(scope),
      }
    : {
        webSearch: webSearchTool,
        mem0Recall: createMem0RecallTool(userId),
        mem0Memorize: createMem0MemorizeTool(userId),
      }

  return new Agent({
    id: 'content',
    name: 'content',
    instructions: CONTENT_PROMPT,
    model: AgentModels.content(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: tools as any,
  })
}
