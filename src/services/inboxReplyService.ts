/**
 * Send a reply in an inbox thread via Composio (Gmail / Outlook).
 */
import { INBOX_PROVIDER } from '@convex/constants'
import { reply as gmailReplyToThread } from '@/services/gmailService'
import { replyToOutlookMessage } from '@/services/outlookService'
import { fetchLiveThreadMessages } from '@/services/inboxLiveMessagesService'

export type InboxThreadLike = {
  provider: typeof INBOX_PROVIDER.GMAIL | typeof INBOX_PROVIDER.OUTLOOK | typeof INBOX_PROVIDER.WHATSAPP
  externalThreadId: string
}

export async function sendInboxThreadReply(params: {
  clerkUserId: string
  userEmailLower: string
  thread: InboxThreadLike
  body: string
}): Promise<void> {
  const { clerkUserId, userEmailLower, thread, body } = params
  const trimmed = body.trim()
  if (!trimmed) {
    throw new Error('Reply body is empty')
  }

  if (thread.provider === INBOX_PROVIDER.WHATSAPP) {
    throw new Error('Reply from the inbox UI is not available for WhatsApp. Use your phone or the chat agent.')
  }

  if (thread.provider === INBOX_PROVIDER.GMAIL) {
    await gmailReplyToThread(clerkUserId, thread.externalThreadId, trimmed)
    return
  }

  const messages = await fetchLiveThreadMessages(
    clerkUserId,
    INBOX_PROVIDER.OUTLOOK,
    thread.externalThreadId,
    userEmailLower
  )
  const last = messages[messages.length - 1]
  if (!last) {
    throw new Error('No messages in this thread to reply to')
  }
  await replyToOutlookMessage(clerkUserId, last.externalMessageId, trimmed)
}
