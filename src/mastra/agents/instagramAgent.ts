import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import { AgentModels } from '@/constants/models'
import { createInstagramSendDMTool } from '../tools/instagramTools'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { INSTAGRAM_PROMPT } from '../prompts'

/** Factory creates an Instagram agent scoped to a user. */
export function createInstagramAgent(userId: string, workspace?: Workspace) {
  return new Agent({
    id: `instagram-${userId}`,
    name: 'instagram',
    instructions: INSTAGRAM_PROMPT,
    model: AgentModels.instagram(),
    workspace,
    tools: {
      instagramSendDM: createInstagramSendDMTool(userId),
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
