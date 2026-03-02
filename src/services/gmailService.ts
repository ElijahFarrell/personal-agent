import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import type { EmailMessage, SendEmailParams } from '@/types'
import { getConnection } from './nangoService'

const GMAIL_PROVIDER = 'gmail' as const

function createGmailClient(accessToken: string) {
  const oauth2Client = new OAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth: oauth2Client })
}

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

/**
 * Lists unread emails for a user. Uses Nango for OAuth tokens.
 *
 * @param userId - User/connection ID
 * @param maxResults - Max messages to return (default 20)
 * @returns Array of unread email messages
 */
export async function listUnread(
  userId: string,
  maxResults = 20
): Promise<EmailMessage[]> {
  const creds = await getConnection(GMAIL_PROVIDER, userId)
  if (!creds) throw new Error('Gmail not connected for user')

  const gmail = createGmailClient(creds.accessToken)
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
    maxResults,
  })

  const messages = res.data.messages ?? []
  const results: EmailMessage[] = []

  for (const m of messages) {
    if (!m.id) continue
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: m.id,
      format: 'full',
    })
    results.push(toEmailMessage(full.data))
  }

  return results
}

/**
 * Fetches a single email by ID.
 *
 * @param userId - User/connection ID
 * @param messageId - Gmail message ID
 * @returns Full email message or null if not found
 */
export async function getMessage(
  userId: string,
  messageId: string
): Promise<EmailMessage | null> {
  const creds = await getConnection(GMAIL_PROVIDER, userId)
  if (!creds) throw new Error('Gmail not connected for user')

  const gmail = createGmailClient(creds.accessToken)
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })

  return toEmailMessage(res.data)
}

/**
 * Sends an email. Supports new threads and replies via replyToThreadId.
 *
 * @param userId - User/connection ID
 * @param params - To, subject, body, optional thread ID for replies
 * @returns Sent message ID
 */
export async function send(
  userId: string,
  params: SendEmailParams
): Promise<string> {
  const creds = await getConnection(GMAIL_PROVIDER, userId)
  if (!creds) throw new Error('Gmail not connected for user')

  const gmail = createGmailClient(creds.accessToken)

  const raw = [
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    params.body,
  ].join('\n')

  const encoded = Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encoded,
      threadId: params.replyToThreadId,
    },
  })

  return res.data.id ?? ''
}

/**
 * Replies to an existing email thread.
 *
 * @param userId - User/connection ID
 * @param threadId - Gmail thread ID
 * @param body - Reply body text
 * @returns Sent message ID
 */
export async function reply(
  userId: string,
  threadId: string,
  body: string
): Promise<string> {
  const creds = await getConnection(GMAIL_PROVIDER, userId)
  if (!creds) throw new Error('Gmail not connected for user')

  const gmail = createGmailClient(creds.accessToken)
  const thread = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Subject'],
  })

  const firstMsg = thread.data.messages?.[0]
  const headers = firstMsg?.payload?.headers ?? []
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    ''

  const subject = getHeader('subject')
  const to = getHeader('from')
  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`

  return send(userId, {
    to,
    subject: replySubject,
    body,
    replyToThreadId: threadId,
  })
}
