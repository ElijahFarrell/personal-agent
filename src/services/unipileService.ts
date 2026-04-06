import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { INBOX_PROVIDER } from '@convex/constants'
import type { Id } from '@convex/_generated/dataModel'
import {
  getUnipileProfile,
  listUnipileAttendees,
  listUnipileChatMessages,
  listUnipileChats,
  sendUnipileInvitation,
  sendUnipileMessage,
  startUnipileChat,
  type UnipileProvider,
} from '@/lib/unipile'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

type DbUser = {
  _id: Id<'users'>
  tenantId: Id<'tenants'>
}

type UnipileAccount = {
  externalAccountId: string
  provider: UnipileProvider
}

type UnipileAttendee = {
  id?: string
  provider_id?: string
  profile_url?: string
  public_url?: string
  identifier?: string
  name?: string
}

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  return []
}

function extractArrayFromPayload<T>(payload: Record<string, unknown>): T[] {
  const data = payload.data
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const dataObj = data as Record<string, unknown>
    if (Array.isArray(dataObj.items)) return dataObj.items as T[]
    if (Array.isArray(dataObj.value)) return dataObj.value as T[]
    if (Array.isArray(dataObj.results)) return dataObj.results as T[]
  }
  if (Array.isArray(payload.items)) return payload.items as T[]
  if (Array.isArray(payload.value)) return payload.value as T[]
  if (Array.isArray(payload.results)) return payload.results as T[]
  return []
}

function normalizeLinkedInIdentifier(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return trimmed
  if (trimmed.includes('linkedin.com/in/')) {
    const match = trimmed.match(/linkedin\.com\/in\/([^/?#]+)/i)
    if (match?.[1]) return decodeURIComponent(match[1])
  }
  return trimmed
}

async function getDbUserByClerkId(clerkUserId: string): Promise<DbUser> {
  const dbUser = await convex.query(api.users.getUserByClerkUserId, { clerkUserId })
  if (!dbUser) {
    throw new Error('User not found')
  }
  return dbUser
}

export async function resolveUnipileAccount(
  clerkUserId: string,
  provider: UnipileProvider
): Promise<UnipileAccount> {
  const dbUser = await getDbUserByClerkId(clerkUserId)
  const account = await convex.query(api.unipileAccounts.getByUserAndProvider, {
    userId: dbUser._id,
    provider,
  })

  if (!account || account.status !== 'operational') {
    throw new Error(
      `No active ${provider} Unipile account found. Please connect it in Integrations.`
    )
  }

  return {
    externalAccountId: account.externalAccountId,
    provider,
  }
}

export async function getUnipileConnectionStatus(
  clerkUserId: string
): Promise<Record<UnipileProvider, boolean>> {
  const dbUser = await getDbUserByClerkId(clerkUserId)
  const rows = await convex.query(api.unipileAccounts.listByUser, { userId: dbUser._id })
  const status: Record<UnipileProvider, boolean> = {
    linkedin: false,
    whatsapp: false,
  }
  for (const row of rows) {
    if (row.provider === 'linkedin' || row.provider === 'whatsapp') {
      status[row.provider] = row.status === 'operational'
    }
  }
  return status
}

async function findLinkedInAttendee(
  accountId: string,
  profileUrlOrIdentifier: string
): Promise<string> {
  const target = normalizeLinkedInIdentifier(profileUrlOrIdentifier).toLowerCase()
  const attendeesPayload = await listUnipileAttendees(accountId)
  const attendees = extractArrayFromPayload<UnipileAttendee>(attendeesPayload)

  for (const attendee of attendees) {
    const candidates = [
      attendee.provider_id,
      attendee.id,
      attendee.identifier,
      attendee.profile_url,
      attendee.public_url,
      attendee.name,
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .filter(Boolean)

    if (candidates.some((candidate) => candidate.includes(target))) {
      return String(attendee.provider_id ?? attendee.id ?? attendee.identifier ?? '')
    }
  }

  if (!target) {
    throw new Error('LinkedIn recipient identifier is required')
  }
  return target
}

export async function sendLinkedInDM(args: {
  clerkUserId: string
  profileUrl: string
  message: string
  inmail?: boolean
}) {
  const account = await resolveUnipileAccount(args.clerkUserId, 'linkedin')
  const attendeeId = await findLinkedInAttendee(
    account.externalAccountId,
    args.profileUrl
  )
  return await startUnipileChat({
    accountId: account.externalAccountId,
    attendeeId,
    text: args.message,
    inmail: args.inmail,
  })
}

export async function sendLinkedInInvitationMessage(args: {
  clerkUserId: string
  profileUrl: string
  message?: string
}) {
  const account = await resolveUnipileAccount(args.clerkUserId, 'linkedin')
  const providerId = await findLinkedInAttendee(
    account.externalAccountId,
    args.profileUrl
  )
  return await sendUnipileInvitation({
    accountId: account.externalAccountId,
    providerId,
    message: args.message,
  })
}

export async function sendWhatsAppReply(args: {
  clerkUserId: string
  externalThreadId: string
  body: string
}) {
  const account = await resolveUnipileAccount(args.clerkUserId, 'whatsapp')
  const threadRef = args.externalThreadId.trim()
  const body = args.body.trim()
  if (!threadRef || !body) {
    throw new Error('externalThreadId and body are required')
  }

  if (threadRef.startsWith('+') || /^\d+$/.test(threadRef)) {
    return await startUnipileChat({
      accountId: account.externalAccountId,
      attendeeId: threadRef,
      text: body,
    })
  }

  return await sendUnipileMessage({
    chatId: threadRef,
    text: body,
  })
}

export async function sendLinkedInReply(args: {
  clerkUserId: string
  externalThreadId: string
  body: string
}) {
  const threadRef = args.externalThreadId.trim()
  const body = args.body.trim()
  if (!threadRef || !body) {
    throw new Error('externalThreadId and body are required')
  }
  return await sendUnipileMessage({ chatId: threadRef, text: body })
}

export async function fetchLinkedInProfile(args: {
  clerkUserId: string
  identifier: string
}) {
  const account = await resolveUnipileAccount(args.clerkUserId, 'linkedin')
  const identifier = normalizeLinkedInIdentifier(args.identifier)
  return await getUnipileProfile({
    accountId: account.externalAccountId,
    identifier,
  })
}

export async function searchLinkedIn(args: {
  clerkUserId: string
  query: string
  limit?: number
}): Promise<Array<{ name?: string; profileUrl?: string; providerId?: string }>> {
  const account = await resolveUnipileAccount(args.clerkUserId, 'linkedin')
  const chatsPayload = await listUnipileChats({
    accountId: account.externalAccountId,
    provider: 'linkedin',
    limit: args.limit ?? 50,
  })
  const chats = extractArrayFromPayload<Record<string, unknown>>(chatsPayload)
  const term = args.query.toLowerCase().trim()
  const out: Array<{ name?: string; profileUrl?: string; providerId?: string }> = []

  for (const chat of chats) {
    const attendees = toArray<Record<string, unknown>>(chat.attendees)
    for (const attendee of attendees) {
      const name = String(attendee.name ?? '')
      const profileUrl = String(attendee.profile_url ?? attendee.public_url ?? '')
      const providerId = String(attendee.provider_id ?? attendee.id ?? '')
      const blob = `${name} ${profileUrl} ${providerId}`.toLowerCase()
      if (!term || blob.includes(term)) {
        out.push({
          name: name || undefined,
          profileUrl: profileUrl || undefined,
          providerId: providerId || undefined,
        })
      }
    }
  }

  return out.slice(0, args.limit ?? 10)
}

export type UnipileLiveMessage = {
  externalMessageId: string
  sentAt: number
  fromEmail: string
  isOutbound: boolean
  bodyPlain: string
}

export async function fetchUnipileThreadMessages(args: {
  clerkUserId: string
  provider: typeof INBOX_PROVIDER.WHATSAPP | typeof INBOX_PROVIDER.LINKEDIN
  externalThreadId: string
}): Promise<UnipileLiveMessage[]> {
  const account = await resolveUnipileAccount(
    args.clerkUserId,
    args.provider === INBOX_PROVIDER.LINKEDIN ? 'linkedin' : 'whatsapp'
  )
  const messagesPayload = await listUnipileChatMessages(args.externalThreadId)
  const rows = extractArrayFromPayload<Record<string, unknown>>(messagesPayload)
  const ownProfilePayload =
    args.provider === INBOX_PROVIDER.LINKEDIN
      ? await getUnipileProfile({
          accountId: account.externalAccountId,
          identifier: 'me',
        }).catch(() => ({} as Record<string, unknown>))
      : {}
  const ownProviderId = String(
    (ownProfilePayload?.provider_id as string | undefined) ??
      (ownProfilePayload?.id as string | undefined) ??
      ''
  )

  const out: UnipileLiveMessage[] = rows.map((row) => {
    const messageId = String(row.id ?? row.message_id ?? crypto.randomUUID())
    const sentAtRaw = String(
      row.timestamp ?? row.sent_at ?? row.created_at ?? row.createdAt ?? ''
    )
    const sentAt = sentAtRaw ? Date.parse(sentAtRaw) || Date.now() : Date.now()
    const text = String(row.text ?? row.body ?? row.message ?? '').trim() || '(No content)'
    const sender = row.sender as Record<string, unknown> | undefined
    const senderId = String(sender?.id ?? sender?.provider_id ?? '')
    const senderLabel = String(
      sender?.name ?? sender?.provider_id ?? sender?.identifier ?? 'unknown'
    )
    const isOutbound = ownProviderId !== '' && senderId !== '' && senderId === ownProviderId

    return {
      externalMessageId: messageId,
      sentAt,
      fromEmail: senderLabel.toLowerCase(),
      isOutbound,
      bodyPlain: text,
    }
  })

  out.sort((a, b) => a.sentAt - b.sentAt)
  return out
}
