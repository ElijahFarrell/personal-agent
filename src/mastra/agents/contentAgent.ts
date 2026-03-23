import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { config } from '@/lib/config'
import { getComposioConnectionStatus, getComposioToolsForProviders } from '@/lib/composio'
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
 * When TikTok is connected via Composio, adds TIKTOK toolkit tools (upload/post).
 */
export async function createContentAgent(
  userId: string,
  scope?: ContentDraftScope,
  workspace?: Workspace
): Promise<Agent> {
  const tools: Record<string, unknown> = scope
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

  if (config.composio.apiKey) {
    const status = await getComposioConnectionStatus(userId)
    if (status.tiktok) {
      const tiktokTools = await getComposioToolsForProviders(userId, ['tiktok'])
      Object.assign(tools, tiktokTools)
    }
  }

  return new Agent({
    id: 'content',
    name: 'content',
    instructions: CONTENT_PROMPT,
    model: AgentModels.content(),
    workspace,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: tools as any,
  })
}
