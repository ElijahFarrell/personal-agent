import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  getWebhookPayload,
  sendDM,
} from '@/services/instagramService'
import { createInstagramAgent } from '@/mastra'
import { config } from '@/lib/config'
import { PERSONAL_CONTEXT } from '@/middleware/tenantContext'

/**
 * GET: Webhook verification — Meta sends hub.challenge, echo it back.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === config.meta.verifyToken && challenge) {
    return new NextResponse(challenge, {
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST: Incoming message webhook.
 * Verify signature, parse payload, route to Instagram agent, send response.
 * Meta requires response within 20 seconds.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const obj = body as Record<string, unknown>
  if (obj?.object !== 'instagram') {
    return NextResponse.json({ ok: true })
  }

  const messages = getWebhookPayload(body)
  if (messages.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { userId } = PERSONAL_CONTEXT
  const agent = createInstagramAgent(userId)

  for (const msg of messages) {
    try {
      const result = await agent.generate(
        `Incoming Instagram DM from ${msg.senderId}:\n\n"${msg.text}"\n\nDraft a helpful reply.`
      )

      const replyText = result.text?.trim()
      if (replyText) {
        await sendDM(msg.senderId, replyText)
      }
    } catch (error) {
      console.error('[Instagram Webhook] Error processing message:', error)
    }
  }

  return NextResponse.json({ ok: true })
}
