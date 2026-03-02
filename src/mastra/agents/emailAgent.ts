import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createGmailReadTool } from '../tools/gmailTools'
import { createGmailSendTool } from '../tools/gmailTools'
import { createGmailReplyTool } from '../tools/gmailTools'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { EMAIL_PROMPT } from '../prompts'

/** Factory creates an email agent scoped to a user. */
export function createEmailAgent(userId: string) {
  return new Agent({
    id: `email-${userId}`,
    name: 'email',
    instructions: EMAIL_PROMPT,
    model: AgentModels.email(),
    tools: {
      gmailRead: createGmailReadTool(userId),
      gmailSend: createGmailSendTool(userId),
      gmailReply: createGmailReplyTool(userId),
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
