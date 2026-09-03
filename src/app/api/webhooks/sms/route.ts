import { NextRequest, NextResponse, after } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { config } from '@/lib/config'
import {
  CALL_DIRECTION,
  INBOX_PROVIDER,
  SMS_LOG_PROVIDER,
  SMS_LOG_STATUS,
} from '@convex/constants'
import { registerSuppressionFromOptOut } from '@/services/compliance/policyEngine'
import { isFeatureEnabled } from '@/constants/featureGating'
import { tenantConfigFromConvexRow } from '@/lib/convexTenantConfig'
import { toInboundReplyEvent } from '@/services/replyOs/adapters/smsWebhookAdapter'
import { ingestInboundReply } from '@/services/replyOs/ingest'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

type SmsProvider = (typeof SMS_LOG_PROVIDER)[keyof typeof SMS_LOG_PROVIDER]

const PROVIDER_MAP: Record<string, SmsProvider> = {
  sms_alert: SMS_LOG_PROVIDER.SMS_ALERT,
  twilio: SMS_LOG_PROVIDER.TWILIO,
  telnyx: SMS_LOG_PROVIDER.TELNYX,
}

function resolveProvider(raw: unknown): SmsProvider {
  const key = String(raw ?? '').toLowerCase().replace(/[\s-]/g, '_')
  return PROVIDER_MAP[key] ?? SMS_LOG_PROVIDER.OTHER
}

function isOptOutMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return /^(stop|unsubscribe|opt[\s-]?out|remove|end|quit|cancel)$/i.test(normalized)
}

/**
 * Generic SMS / messaging provider webhook (SMS Alert, Twilio, etc.).
 * Also bridges each message into the unified inbox for real-time display.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = config.webhooks.sms
    if (secret) {
      const h =
        req.headers.get('x-sms-webhook-secret') ??
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
      if (h !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const raw = (await req.json()) as Record<string, unknown>
    const tenantId = raw.tenantId as string | undefined
    if (!tenantId) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const internalSecret = config.webhooks.internalSecret
    if (!internalSecret) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const direction =
      raw.direction === 'inbound' ? CALL_DIRECTION.INBOUND : CALL_DIRECTION.OUTBOUND

    const statusRaw = String(raw.status ?? 'sent').toLowerCase()
    const statusMap: Record<string, (typeof SMS_LOG_STATUS)[keyof typeof SMS_LOG_STATUS]> = {
      queued: SMS_LOG_STATUS.QUEUED,
      sent: SMS_LOG_STATUS.SENT,
      delivered: SMS_LOG_STATUS.DELIVERED,
      failed: SMS_LOG_STATUS.FAILED,
      received: SMS_LOG_STATUS.RECEIVED,
      replied: SMS_LOG_STATUS.REPLIED,
    }
    const status = statusMap[statusRaw] ?? SMS_LOG_STATUS.SENT
    const provider = resolveProvider(raw.provider)
    const bodyText = String(raw.body ?? '')
    const phone = String(raw.from ?? raw.to ?? raw.phone ?? '')
    const externalMessageId =
      typeof raw.externalMessageId === 'string'
        ? raw.externalMessageId
        : `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const prospectId =
      typeof raw.prospectId === 'string'
        ? (raw.prospectId as Id<'prospects'>)
        : undefined
    const now = Date.now()

    await convex.mutation(api.smsLogs.createFromWebhook, {
      webhookSecret: internalSecret,
      tenantId: tenantId as Id<'tenants'>,
      provider,
      externalMessageId,
      direction,
      body: bodyText,
      status,
      replyBody: typeof raw.replyBody === 'string' ? raw.replyBody : undefined,
      prospectId,
      rawPayload: raw,
    })

    if (direction === CALL_DIRECTION.INBOUND && phone && isOptOutMessage(bodyText)) {
      await registerSuppressionFromOptOut({
        tenantId: tenantId as Id<'tenants'>,
        phone,
        source: 'sms_webhook_stop',
      })
    }

    // Bridge into unified inbox so SMS threads appear in real time.
    // Requires a userId — try from payload, fall back to tenant owner lookup.
    const userId = raw.userId as string | undefined
    if (userId && phone) {
      try {
        const threadId = await convex.mutation(api.inbox.upsertThread, {
          tenantId: tenantId as Id<'tenants'>,
          userId: userId as Id<'users'>,
          provider: INBOX_PROVIDER.SMS,
          externalThreadId: phone,
          subject: `SMS with ${phone}`,
          snippet: bodyText.slice(0, 200),
          lastMessageAt: now,
          participantEmails: [phone],
          prospectId,
          needsReply: direction === CALL_DIRECTION.INBOUND,
        })

        await convex.mutation(api.inbox.insertMessage, {
          threadId,
          externalMessageId,
          sentAt: now,
          fromEmail: direction === CALL_DIRECTION.INBOUND ? phone : 'you',
          senderLabel:
            direction === CALL_DIRECTION.INBOUND ? phone : undefined,
          bodyPreview: bodyText,
          isOutbound: direction === CALL_DIRECTION.OUTBOUND,
        })
      } catch (e) {
        console.warn('[webhooks/sms] inbox bridge failed:', e)
      }

      if (direction === CALL_DIRECTION.INBOUND) {
        try {
          const cfgRow = await convex.query(api.tenantConfigs.getByTenantId, {
            tenantId: tenantId as Id<'tenants'>,
          })
          const orgConfig = tenantConfigFromConvexRow(cfgRow)
          const event = toInboundReplyEvent(raw, {
            tenantId: tenantId as Id<'tenants'>,
            userId: userId as Id<'users'>,
          })
          if (event && isFeatureEnabled(orgConfig, 'sellerReplyOs')) {
            after(() =>
              ingestInboundReply(event).catch((err) => {
                console.warn('[webhooks/sms] seller reply ingest failed:', err)
              })
            )
          }
        } catch (e) {
          console.warn('[webhooks/sms] seller reply os skipped:', e)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[webhooks/sms]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook error' },
      { status: 500 }
    )
  }
}
