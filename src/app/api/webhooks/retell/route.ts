import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { config } from '@/lib/config'
import {
  CALL_DIRECTION,
  CALL_LOG_PROVIDER,
  CALL_LOG_STATUS,
} from '@convex/constants'
import { registerSuppressionFromOptOut } from '@/services/compliance/policyEngine'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Retell AI webhooks — register URL in Retell dashboard.
 * Verifies RETELL_WEBHOOK_SECRET (Bearer or x-retell-signature) when set.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = config.webhooks.retell
    if (secret) {
      const auth = req.headers.get('authorization')
      const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
      const sig = req.headers.get('x-retell-signature')
      if (bearer !== secret && sig !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const raw = (await req.json()) as Record<string, unknown>
    const event = String(raw.event ?? raw.type ?? '')
    const call = (raw.call ?? raw) as Record<string, unknown>
    const callId = String(call.call_id ?? call.callId ?? raw.call_id ?? '')
    if (!callId) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const meta = (call.metadata ?? {}) as Record<string, unknown>
    let tenantId = meta.shilohTenantId as string | undefined
    if (!tenantId && typeof meta.shilohTenantId === 'number') {
      tenantId = String(meta.shilohTenantId)
    }

    if (!tenantId) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'no_tenant_metadata' })
    }

    const transcript =
      typeof call.transcript === 'string'
        ? call.transcript
        : typeof call.transcript_object === 'object'
          ? JSON.stringify(call.transcript_object)
          : undefined

    const durationMs =
      typeof call.duration_ms === 'number'
        ? call.duration_ms
        : typeof call.duration_ms === 'string'
          ? parseInt(call.duration_ms, 10)
          : undefined

    const recordingUrl =
      typeof call.recording_url === 'string' ? call.recording_url : undefined

    const agentId =
      typeof call.agent_id === 'string' ? call.agent_id : undefined

    const analysis = call.call_analysis ?? call.callAnalysis

    let status: (typeof CALL_LOG_STATUS)[keyof typeof CALL_LOG_STATUS] =
      CALL_LOG_STATUS.IN_PROGRESS
    if (event.includes('call_ended') || event === 'call_ended') {
      status = CALL_LOG_STATUS.ENDED
    }
    if (event.includes('call_analyzed') || event === 'call_analyzed') {
      status = CALL_LOG_STATUS.ANALYZED
    }

    const prospectIdRaw = meta.shilohProspectId
    const prospectId =
      typeof prospectIdRaw === 'string'
        ? (prospectIdRaw as Id<'prospects'>)
        : undefined

    const internalSecret = config.webhooks.internalSecret
    if (!internalSecret) {
      console.warn('[webhooks/retell] INTERNAL_WEBHOOK_SECRET not set; skipping Convex write')
      return NextResponse.json({ ok: true, skipped: true })
    }

    await convex.mutation(api.callLogs.upsertFromWebhook, {
      webhookSecret: internalSecret,
      tenantId: tenantId as Id<'tenants'>,
      provider: CALL_LOG_PROVIDER.RETELL,
      externalCallId: callId,
      direction: CALL_DIRECTION.OUTBOUND,
      durationMs,
      transcript,
      recordingUrl,
      analysis,
      status,
      retellAgentId: agentId,
      rawPayload: raw,
      prospectId,
    })

    const toNumber =
      typeof call.to_number === 'string'
        ? call.to_number
        : typeof meta.shilohToNumber === 'string'
          ? meta.shilohToNumber
          : ''
    const callDisposition = String(
      (call.call_analysis as Record<string, unknown> | undefined)?.call_disposition ??
        (call.call_analysis as Record<string, unknown> | undefined)?.disposition ??
        ''
    ).toLowerCase()
    if (
      toNumber &&
      (callDisposition.includes('opt_out') || callDisposition.includes('do_not_call'))
    ) {
      await registerSuppressionFromOptOut({
        tenantId: tenantId as Id<'tenants'>,
        phone: toNumber,
        source: 'retell_call_disposition',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[webhooks/retell]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook error' },
      { status: 500 }
    )
  }
}
