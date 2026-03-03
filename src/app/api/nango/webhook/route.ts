import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { config } from '@/lib/config'

interface NangoAuthWebhookBody {
  type: 'auth'
  connectionId: string
  providerConfigKey: string
  operation: string
  success: boolean
  endUser?: {
    endUserId: string
    organizationId?: string
    endUserEmail?: string | null
  }
}

function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false
  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  return signature === expected
}

function getConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is required')
  return new ConvexHttpClient(url)
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    console.log('[Nango Webhook] Received request, body length:', rawBody.length)

    const signature =
      req.headers.get('x-nango-hmac-sha256') ??
      req.headers.get('X-Nango-Hmac-Sha256')

    const webhookSecret = config.nango.webhookSecret
    if (
      !webhookSecret ||
      !verifyWebhookSignature(rawBody, signature, webhookSecret)
    ) {
      console.warn('[Nango Webhook] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody) as NangoAuthWebhookBody

    console.log(
      `[Nango Webhook] type=${body.type} | operation=${body.operation} | success=${body.success} | provider=${body.providerConfigKey} | endUserId=${body.endUser?.endUserId ?? 'none'}`,
    )

    if (body.type !== 'auth') {
      return NextResponse.json({ ok: true })
    }

    const { connectionId, providerConfigKey, operation, success } = body
    const convex = getConvexClient()

    if (operation === 'creation' && success) {
      const endUser = body.endUser
      if (!endUser?.endUserId) {
        return NextResponse.json({ ok: true })
      }

      const clerkUserId = endUser.endUserId
      const email = endUser.endUserEmail ?? `${clerkUserId}@placeholder.local`

      const { userId, tenantId } = await convex.mutation(api.users.ensureUser, {
        clerkUserId,
        email,
        name: email.split('@')[0],
        orgId: endUser.organizationId,
      })

      await convex.mutation(api.integrations.upsertIntegration, {
        userId,
        tenantId,
        provider: providerConfigKey,
        connectionId,
      })
    } else if (operation === 'refresh' && !success) {
      const convex = getConvexClient()
      await convex.mutation(api.integrations.markNeedsReconnect, {
        connectionId,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Nango Webhook] Error:', error)
    return NextResponse.json({ ok: true })
  }
}
