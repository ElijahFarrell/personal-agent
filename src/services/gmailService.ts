/**
 * Gmail operations via Composio.
 * Uses Composio GMAIL tools with the user's connected account.
 */
import type { EmailMessage, SendEmailParams } from '@/types'
import { executeComposioTool } from '@/lib/composio'

function parseEmailAddress(header: string | undefined): string {
  if (!header) return ''
  const match = header.match(/<([^>]+)>/)
  return match ? match[1] : header.trim()
}

function parseEmailAddresses(header: string | undefined): string[] {
  if (!header) return []
  return header.split(',').map((addr) => parseEmailAddress(addr.trim()))
}

function toEmailMessage(msg: {
  id?: string | null
  threadId?: string | null
  snippet?: string | null
  payload?: {
    headers?: Array<{ name?: string | null; value?: string | null }>
    body?: { data?: string | null }
    parts?: Array<{
      mimeType?: string | null
      body?: { data?: string | null }
    }>
  }
  labelIds?: string[] | null
}): EmailMessage {
  const headers = msg.payload?.headers ?? []
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

  let body = ''
  if (msg.payload?.body?.data) {
    body = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8')
  } else if (msg.payload?.parts) {
    const textPart = msg.payload.parts.find(
      (p) => p.mimeType === 'text/plain' || !p.mimeType
    )
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8')
    }
  }

  const isRead = !msg.labelIds?.includes('UNREAD')

  return {
    id: msg.id ?? '',
    subject: getHeader('subject'),
    from: parseEmailAddress(getHeader('from')),
    to: parseEmailAddresses(getHeader('to')),
    body,
    snippet: msg.snippet ?? '',
    date: getHeader('date'),
    threadId: msg.threadId ?? '',
    isRead,
  }
}

function mapComposioMessageToEmailMessage(m: Record<string, unknown>): EmailMessage {
  const payload = m.payload as Record<string, unknown> | undefined
  const headers = (payload?.headers as Array<{ name?: string; value?: string }>) ?? []
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

  let body = ''
  const bodyData = payload?.body as { data?: string } | undefined
  if (bodyData?.data) {
    try {
      body = Buffer.from(
        (bodyData.data as string).replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf-8')
    } catch {
      body = ''
    }
  }

  const labelIds = (m.labelIds as string[]) ?? []
  const isRead = !labelIds.includes('UNREAD')

  return {
    id: (m.id ?? m.messageId ?? '') as string,
    subject: getHeader('subject'),
    from: parseEmailAddress(getHeader('from')),
    to: parseEmailAddresses(getHeader('to')),
    body,
    snippet: (m.snippet as string) ?? '',
    date: getHeader('date'),
    threadId: (m.threadId ?? '') as string,
    isRead,
  }
}

/**
 * Lists unread emails for a user. Uses Composio GMAIL_FETCH_EMAILS.
 */
export async function listUnread(
  userId: string,
  maxResults = 20
): Promise<EmailMessage[]> {
  const result = await executeComposioTool<{ messages?: Record<string, unknown>[] }>(
    userId,
    'GMAIL_FETCH_EMAILS',
    {
      query: 'is:unread',
      max_results: maxResults,
      include_payload: true,
    }
  )

  if (!result.successful || !result.data?.messages) {
    if (result.error) throw new Error(result.error)
    return []
  }

  return result.data.messages.map(mapComposioMessageToEmailMessage)
}

/**
 * Fetches a single email by ID.
 */
export async function getMessage(
  userId: string,
  messageId: string
): Promise<EmailMessage | null> {
  const result = await executeComposioTool<Record<string, unknown>>(
    userId,
    'GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID',
    { message_id: messageId, format: 'full' }
  )

  if (!result.successful || !result.data) return null
  return mapComposioMessageToEmailMessage(result.data)
}

/**
 * Sends an email via Composio GMAIL_SEND_EMAIL.
 */
export async function send(
  userId: string,
  params: SendEmailParams
): Promise<string> {
  const result = await executeComposioTool<{ id?: string }>(
    userId,
    'GMAIL_SEND_EMAIL',
    {
      recipient_email: params.to,
      subject: params.subject,
      body: params.body,
      is_html: false,
    }
  )

  if (!result.successful && result.error) {
    throw new Error(result.error)
  }

  return result.data?.id ?? ''
}

/**
 * Replies to an existing email thread.
 */
export async function reply(
  userId: string,
  threadId: string,
  body: string
): Promise<string> {
  const threadResult = await executeComposioTool<{ messages?: Array<{ payload?: { headers?: Array<{ name?: string; value?: string }> } }> }>(
    userId,
    'GMAIL_FETCH_MESSAGE_BY_THREAD_ID',
    { thread_id: threadId }
  )

  if (!threadResult.successful || !threadResult.data?.messages?.length) {
    throw new Error('Could not fetch thread for reply')
  }

  const firstMsg = threadResult.data.messages[0]
  const headers = firstMsg?.payload?.headers ?? []
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
  const to = getHeader('from')

  const result = await executeComposioTool<{ id?: string }>(
    userId,
    'GMAIL_REPLY_TO_THREAD',
    {
      thread_id: threadId,
      recipient_email: to,
      message_body: body,
      is_html: false,
    }
  )

  if (!result.successful && result.error) {
    throw new Error(result.error)
  }

  return result.data?.id ?? ''
}
