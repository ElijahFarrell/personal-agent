/**
 * Instagram DM service using Meta Graph API (official, production-safe).
 * Requires: Instagram Business account connected via Meta API.
 */
import crypto from 'node:crypto'
import { config } from '@/lib/config'

const GRAPH_API_VERSION = 'v21.0'
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export interface InstagramMessage {
  senderId: string
  text: string
  timestamp: number
}

export interface SendDMResult {
  messageId: string
  recipientId: string
}

function getAccessToken(): string {
  const token = config.meta.igAccessToken
  if (!token?.trim()) {
    throw new Error(
      'Instagram API is not configured. Set IG_PAGE_ACCESS_TOKEN in your environment. ' +
        'Connect your Instagram Business account via Meta for Developers.'
    )
  }
  return token
}

/**
 * Send a DM via Meta Graph API.
 */
export async function sendDM(
  recipientIgId: string,
  message: string
): Promise<SendDMResult> {
  const token = getAccessToken()
  const trimmedMessage = message.trim()
  if (!trimmedMessage) throw new Error('Message is required')
  if (trimmedMessage.length > 1000) {
    throw new Error('Message must be 1000 characters or less')
  }

  const params = new URLSearchParams({
    recipient: JSON.stringify({ id: recipientIgId }),
    message: JSON.stringify({ text: trimmedMessage }),
    messaging_type: 'RESPONSE',
    access_token: token,
  })

  const res = await fetch(`${BASE_URL}/me/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const body = (await res.json()) as {
    recipient_id?: string
    message_id?: string
    error?: { message: string; code: number }
  }

  if (!res.ok || body.error) {
    const errMsg = body.error?.message ?? `HTTP ${res.status}`
    throw new Error(`Instagram API: ${errMsg}`)
  }

  return {
    messageId: body.message_id ?? '',
    recipientId: body.recipient_id ?? recipientIgId,
  }
}

/**
 * Parse incoming webhook payload from Meta.
 * Extracts sender ID, message text, and timestamp from Instagram webhook format.
 */
export function getWebhookPayload(body: unknown): InstagramMessage[] {
  const messages: InstagramMessage[] = []
  const obj = body as Record<string, unknown>
  const entries = obj?.entry as Array<Record<string, unknown>> | undefined
  if (!Array.isArray(entries)) return messages

  for (const entry of entries) {
    const messaging = entry.messaging as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(messaging)) continue

    for (const item of messaging) {
      const sender = item.sender as { id?: string } | undefined
      const senderId = sender?.id
      if (!senderId || typeof senderId !== 'string') continue

      const msg = item.message as Record<string, unknown> | undefined
      if (!msg) continue

      if (msg.is_echo === true) continue
      if (msg.is_deleted === true) continue
      if (msg.is_unsupported === true) continue

      const text = msg.text as string | undefined
      const timestamp = (item.timestamp as number) ?? 0

      if (text && typeof text === 'string') {
        messages.push({ senderId, text, timestamp })
      }
    }
  }

  return messages
}

/**
 * Verify X-Hub-Signature-256 header using config.meta.appSecret.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const appSecret = config.meta.appSecret
  if (!appSecret?.trim()) return false

  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex')}`

  if (signature.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
