import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import {
  browserNavigateTool,
  browserExtractTool,
  browserFillFormTool,
} from '../tools/browserTools'
import { webSearchTool } from '../tools/webSearchTool'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { BROWSER_PROMPT } from '../prompts'

/** Factory creates a browser agent scoped to a user. */
export function createBrowserAgent(userId: string, workspace?: Workspace) {
  return new Agent({
    id: `browser-${userId}`,
    name: 'browser',
    instructions: BROWSER_PROMPT,
    model: AgentModels.browser(),
    workspace,
    tools: {
      browserNavigate: browserNavigateTool,
      browserExtract: browserExtractTool,
      browserFillForm: browserFillFormTool,
      webSearch: webSearchTool,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
