import { UnipileClient } from 'unipile-node-sdk'
import { config } from '@/lib/config'
export type { UnipileProvider } from '@/types'

type HostedAuthProvider = 'LINKEDIN' | 'WHATSAPP'

interface HostedAuthLinkInput {
  provider: UnipileProvider
  clerkUserId: string
  notifyUrl: string
  successRedirectUrl: string
  failureRedirectUrl: string
  expiresOn: string
}

interface HostedAuthLinkResponse {
  url?: string
}

interface UnipileMessagingClient {
  startNewChat(input: Record<string, unknown>): Promise<Record<string, unknown>>
  sendMessage(input: Record<string, unknown>): Promise<Record<string, unknown>>
  getAllChats(input?: Record<string, unknown>): Promise<Record<string, unknown>>
  getAllMessagesFromChat(input: Record<string, unknown>): Promise<Record<string, unknown>>
  getAllAttendees(input: Record<string, unknown>): Promise<Record<string, unknown>>
}

interface UnipileUsersClient {
  getProfile(input: Record<string, unknown>): Promise<Record<string, unknown>>
  sendInvitation(input: Record<string, unknown>): Promise<Record<string, unknown>>
}

interface UnipileAccountClient {
  createHostedAuthLink(input: Record<string, unknown>): Promise<HostedAuthLinkResponse>
}

interface UnipileRequestClient {
  send(input: {
    path: string[]
    method: 'GET' | 'POST'
    parameters?: Record<string, unknown>
    body?: Record<string, unknown>
  }): Promise<Record<string, unknown>>
}

interface StrictUnipileClient {
  account: UnipileAccountClient
  messaging: UnipileMessagingClient
  users: UnipileUsersClient
  request: UnipileRequestClient
}

let clientInstance: StrictUnipileClient | null = null

function getRequiredUnipileConfig() {
  const dsn = config.unipile.dsn.trim()
  const apiKey = config.unipile.apiKey.trim()
  if (!dsn || !apiKey) {
    throw new Error('Unipile is not configured. Set UNIPILE_DSN and UNIPILE_API_KEY.')
  }
  return { dsn, apiKey }
}

function toHostedProvider(provider: UnipileProvider): HostedAuthProvider {
  return provider === 'linkedin' ? 'LINKEDIN' : 'WHATSAPP'
}

export function getUnipileClient(): StrictUnipileClient {
  if (!clientInstance) {
    const { dsn, apiKey } = getRequiredUnipileConfig()
    clientInstance = new UnipileClient(
      dsn,
      apiKey
    ) as unknown as StrictUnipileClient
  }
  return clientInstance
}

export async function createHostedAuthLink(
  input: HostedAuthLinkInput
): Promise<string> {
  const client = getUnipileClient()
  const response = await client.account.createHostedAuthLink({
    type: 'create',
    api_url: config.unipile.dsn,
    providers: [toHostedProvider(input.provider)],
    name: input.clerkUserId,
    notify_url: input.notifyUrl,
    success_redirect_url: input.successRedirectUrl,
    failure_redirect_url: input.failureRedirectUrl,
    expiresOn: input.expiresOn,
  })
  const url = response?.url
  if (!url) {
    throw new Error('Unipile did not return a hosted auth URL.')
  }
  return url
}

export async function startUnipileChat(args: {
  accountId: string
  attendeeId: string
  text: string
  inmail?: boolean
}) {
  const client = getUnipileClient()
  return await client.messaging.startNewChat({
    account_id: args.accountId,
    attendees_ids: [args.attendeeId],
    text: args.text,
    ...(args.inmail
      ? {
          options: {
            linkedin: { inmail: true },
          },
        }
      : {}),
  })
}

export async function sendUnipileMessage(args: {
  chatId: string
  text: string
}) {
  const client = getUnipileClient()
  return await client.messaging.sendMessage({
    chat_id: args.chatId,
    text: args.text,
  })
}

export async function listUnipileChats(args: {
  accountId: string
  provider: UnipileProvider
  limit?: number
}) {
  const client = getUnipileClient()
  return await client.messaging.getAllChats({
    account_id: args.accountId,
    account_type: toHostedProvider(args.provider),
    ...(args.limit ? { limit: args.limit } : {}),
  })
}

export async function listUnipileChatMessages(chatId: string) {
  const client = getUnipileClient()
  return await client.messaging.getAllMessagesFromChat({ chat_id: chatId })
}

export async function listUnipileAttendees(accountId: string) {
  const client = getUnipileClient()
  return await client.messaging.getAllAttendees({ account_id: accountId })
}

export async function getUnipileProfile(args: {
  accountId: string
  identifier: string
}) {
  const client = getUnipileClient()
  return await client.users.getProfile({
    account_id: args.accountId,
    identifier: args.identifier,
  })
}

export async function sendUnipileInvitation(args: {
  accountId: string
  providerId: string
  message?: string
}) {
  const client = getUnipileClient()
  return await client.users.sendInvitation({
    account_id: args.accountId,
    provider_id: args.providerId,
    ...(args.message ? { message: args.message } : {}),
  })
}
