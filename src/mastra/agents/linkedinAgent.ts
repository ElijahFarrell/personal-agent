import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createLinkedInProfileTool } from '../tools/linkedinTools'
import { createLinkedInDMTool } from '../tools/linkedinTools'
import { createLinkedInSearchTool } from '../tools/linkedinTools'
import { webSearchTool } from '../tools/webSearchTool'
import { LINKEDIN_PROMPT } from '../prompts'

/**
 * Factory creates a LinkedIn agent scoped to a user for memory isolation.
 */
export function createLinkedInAgent(userId: string): Agent {
  return new Agent({
    id: 'linkedin',
    name: 'linkedin',
    instructions: LINKEDIN_PROMPT,
    model: AgentModels.linkedin(),
    tools: {
      linkedinProfile: createLinkedInProfileTool(userId),
      linkedinDM: createLinkedInDMTool(userId),
      linkedinSearch: createLinkedInSearchTool(userId),
      webSearch: webSearchTool,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
