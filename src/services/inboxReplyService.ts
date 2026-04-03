/**
 * Send a reply in an inbox thread via Composio (Gmail / Outlook) or SMS provider.
 */
import { INBOX_PROVIDER } from '@convex/constants'
import { reply as gmailReplyToThread } from '@/services/gmailService'
import { replyToOutlookMessage } from '@/services/outlookService'
import { fetchLiveThreadMessages } from '@/services/inboxLiveMessagesService'
import { executeComposioTool } from '@/lib/composio'
import { COMPOSIO_WORKFLOW_DEFAULT_TOOLS } from '@/constants/composioWorkflowTools'

export type InboxThreadLike = {
  provider:
    | typeof INBOX_PROVIDER.GMAIL
    | typeof INBOX_PROVIDER.OUTLOOK
    | typeof INBOX_PROVIDER.WHATSAPP
    | typeof INBOX_PROVIDER.SMS
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

  if (thread.provider === INBOX_PROVIDER.SMS) {
    const phone = thread.externalThreadId
    if (!phone) throw new Error('No phone number on this SMS thread')
    await executeComposioTool(clerkUserId, COMPOSIO_WORKFLOW_DEFAULT_TOOLS.smsSend, {
      body: trimmed,
      to: phone,
    })
    return
  }

  if (thread.provider === INBOX_PROVIDER.WHATSAPP) {
    const phone = thread.externalThreadId
    if (!phone) throw new Error('No WhatsApp ID on this thread')
    await executeComposioTool(clerkUserId, COMPOSIO_WORKFLOW_DEFAULT_TOOLS.smsSend, {
      body: trimmed,
      to: phone,
    })
    return
  }

  if (thread.provider === INBOX_PROVIDER.GMAIL) {
    await gmailReplyToThread(clerkUserId, thread.externalThreadId, trimmed)
    return
  }

  // Outlook
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
