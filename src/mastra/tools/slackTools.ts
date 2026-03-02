import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import * as slackService from '@/services/slackService'

export function createSlackListChannelsTool(userId: string) {
  return createTool({
    id: 'slack-list-channels',
    description: 'List all Slack channels in the connected workspace.',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const channels = await slackService.listChannels(userId)
        return { channels, count: channels.length }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to list channels' }
      }
    },
  })
}

export function createSlackListUsersTool(userId: string) {
  return createTool({
    id: 'slack-list-users',
    description: 'List all users in the connected Slack workspace.',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const users = await slackService.listUsers(userId)
        return { users: users.filter((u) => !u.isBot), count: users.length }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to list users' }
      }
    },
  })
}

export function createSlackSendMessageTool(userId: string) {
  return createTool({
    id: 'slack-send-message',
    description:
      'Send a message to a Slack channel. Requires a channel ID (use slack-list-channels to find it) and message text.',
    inputSchema: z.object({
      channel: z.string().describe('Slack channel ID (e.g., C01234ABCDE)'),
      text: z.string().describe('Message text to send'),
    }),
    execute: async ({ channel, text }) => {
      try {
        const result = await slackService.sendMessage(userId, channel, text)
        return { success: true, ...result }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to send message' }
      }
    },
  })
}
