/**
 * Slack operations via Composio.
 * Uses Composio SLACK tools with the user's connected account.
 */
import { executeComposioTool } from '@/lib/composio'

export interface SlackChannel {
  id: string
  name: string
  topic: string
  memberCount: number
}

export interface SlackUser {
  id: string
  name: string
  realName: string
  isBot: boolean
}

/**
 * Lists channels. Uses Composio SLACK_LIST_CHANNELS or similar.
 * Fallback: returns empty if tool not available.
 */
export async function listChannels(userId: string): Promise<SlackChannel[]> {
  const result = await executeComposioTool<{ channels?: Array<Record<string, unknown>> }>(
    userId,
    'SLACK_LIST_CONVERSATIONS',
    { types: 'public_channel,private_channel' }
  )

  const channels = result.data?.channels ?? (result.data as { channels?: Array<Record<string, unknown>> })?.channels
  if (!result.successful || !channels) {
    if (result.error) throw new Error(result.error)
    return []
  }

  return channels.map((ch) => ({
    id: (ch.id ?? ch.channel_id ?? '') as string,
    name: (ch.name ?? '') as string,
    topic: ((ch.topic as { value?: string })?.value ?? '') as string,
    memberCount: (ch.num_members ?? ch.member_count ?? 0) as number,
  }))
}

/**
 * Lists users. Uses Composio SLACK_LIST_USERS or similar.
 */
export async function listUsers(userId: string): Promise<SlackUser[]> {
  const result = await executeComposioTool<{ members?: Array<Record<string, unknown>> }>(
    userId,
    'SLACK_LIST_ALL_USERS',
    {}
  )

  const members = result.data?.members ?? (result.data as { members?: Array<Record<string, unknown>> })?.members
  if (!result.successful || !members) {
    if (result.error) throw new Error(result.error)
    return []
  }

  return members
    .filter((m) => !m.deleted)
    .map((m) => ({
      id: (m.id ?? '') as string,
      name: (m.name ?? '') as string,
      realName: (m.real_name ?? '') as string,
      isBot: Boolean(m.is_bot),
    }))
}

/**
 * Sends a message to a Slack channel.
 */
export async function sendMessage(
  userId: string,
  channel: string,
  text: string
): Promise<{ ts: string; channel: string }> {
  const result = await executeComposioTool<{ ts?: string; channel?: string }>(
    userId,
    'SLACK_SEND_MESSAGE',
    {
      channel,
      text,
    }
  )

  if (!result.successful && result.error) {
    throw new Error(result.error)
  }

  return {
    ts: result.data?.ts ?? '',
    channel: result.data?.channel ?? channel,
  }
}
