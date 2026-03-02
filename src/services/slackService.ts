import { getConnection } from './nangoService'

const SLACK_API = 'https://slack.com/api'

async function slackFetch(endpoint: string, userId: string, body?: Record<string, unknown>) {
  const creds = await getConnection('slack', userId)
  if (!creds) throw new Error('Slack is not connected. Ask the user to connect Slack in Integrations.')

  const res = await fetch(`${SLACK_API}/${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    ...(body && { body: JSON.stringify(body) }),
  })

  const data = await res.json()
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`)
  return data
}

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

export async function listChannels(userId: string): Promise<SlackChannel[]> {
  const data = await slackFetch('conversations.list', userId)
  return (data.channels ?? []).map((ch: Record<string, unknown>) => ({
    id: ch.id as string,
    name: ch.name as string,
    topic: (ch.topic as { value?: string })?.value ?? '',
    memberCount: ch.num_members as number ?? 0,
  }))
}

export async function listUsers(userId: string): Promise<SlackUser[]> {
  const data = await slackFetch('users.list', userId)
  return (data.members ?? [])
    .filter((m: Record<string, unknown>) => !m.deleted)
    .map((m: Record<string, unknown>) => ({
      id: m.id as string,
      name: m.name as string,
      realName: (m.real_name as string) ?? '',
      isBot: Boolean(m.is_bot),
    }))
}

export async function sendMessage(
  userId: string,
  channel: string,
  text: string
): Promise<{ ts: string; channel: string }> {
  const data = await slackFetch('chat.postMessage', userId, { channel, text })
  return { ts: data.ts, channel: data.channel }
}
