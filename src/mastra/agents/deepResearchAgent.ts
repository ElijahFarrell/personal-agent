import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { deepSearchTool } from '../tools/deepSearchTool'
import { redditSearchTool } from '../tools/redditSearchTool'
import { newsSearchTool } from '../tools/newsSearchTool'
import { generateChartTool } from '../tools/generateChartTool'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { createSubAgentMemory } from '../memory'
import { DEEP_RESEARCH_PROMPT } from '../prompts'
import { AGENT_META, getAgentSchemas } from './schemas'

export const DEEP_RESEARCH_AGENT_SCHEMAS = getAgentSchemas('deepResearch')

/** Factory creates a deep research agent scoped to a user. */
export function createDeepResearchAgent(userId: string) {
  return new Agent({
    id: `deep-research-${userId}`,
    name: 'deep-research',
    description: AGENT_META.deepResearch.description,
    instructions: DEEP_RESEARCH_PROMPT,
    model: AgentModels.deepResearch(),
    memory: createSubAgentMemory('deepResearch'),
    tools: {
      deepSearch: deepSearchTool,
      redditSearch: redditSearchTool,
      newsSearch: newsSearchTool,
      generateChart: generateChartTool,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
