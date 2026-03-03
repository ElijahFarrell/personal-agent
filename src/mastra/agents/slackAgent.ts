import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createSlackListChannelsTool, createSlackListUsersTool, createSlackSendMessageTool } from '../tools/slackTools'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { SLACK_PROMPT } from '../prompts/slack'

export function createSlackAgent(userId: string) {
  return new Agent({
    id: `slack-${userId}`,
    name: 'slack',
    instructions: SLACK_PROMPT,
    model: AgentModels.slack(),
    tools: {
      slackListChannels: createSlackListChannelsTool(userId),
      slackListUsers: createSlackListUsersTool(userId),
      slackSendMessage: createSlackSendMessageTool(userId),
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
