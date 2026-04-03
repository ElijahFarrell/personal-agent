import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { config } from '@/lib/config'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { COMPLIANCE_CHANNEL } from '@convex/constants'
import { assertComplianceOrThrow } from '@/services/compliance/policyEngine'
import { withMandatoryVoiceDisclosures } from '@/constants/complianceDisclosures'
import { ensureLegalAcceptance } from '@/services/compliance/legalGate'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/voice/retell/web-call
 * Body: { agentId: string, prospectId?: Id<'prospects'> }
 * Creates a Retell web call and returns access_token for retell-client-js-sdk.
 */
export async function POST(req: NextRequest) {
  try {
    if (!config.retell.apiKey) {
      return NextResponse.json(
        { error: 'RETELL_API_KEY is not configured' },
        { status: 503 }
      )
    }

    const { userId } = await getTenantContext()
    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch(() => null)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    await ensureLegalAcceptance({
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
    })

    const body = (await req.json()) as {
      agentId?: string
      prospectId?: string
      toNumber?: string
      timezone?: string
      stateCode?: string
      openingScript?: string
    }

    const agentId = body.agentId?.trim()
    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }

    const prospectId = body.prospectId as Id<'prospects'> | undefined
    const toNumber = body.toNumber?.trim()
    if (toNumber) {
      await assertComplianceOrThrow({
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
        channel: COMPLIANCE_CHANNEL.VOICE_CALL,
        phone: toNumber,
        timezone: body.timezone,
        stateCode: body.stateCode,
        payload: body,
      })
    }

    const res = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.retell.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        retell_llm_dynamic_variables: {
          shiloh_mandatory_opening_disclosure: withMandatoryVoiceDisclosures(
            body.openingScript
          ),
        },
        metadata: {
          shilohTenantId: String(dbUser.tenantId),
          shilohUserId: String(dbUser._id),
          ...(prospectId ? { shilohProspectId: String(prospectId) } : {}),
          ...(toNumber ? { shilohToNumber: toNumber } : {}),
          ...(body.timezone ? { shilohTimezone: body.timezone } : {}),
          ...(body.stateCode ? { shilohStateCode: body.stateCode } : {}),
        },
      }),
    })

    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
      const msg =
        typeof data.message === 'string'
          ? data.message
          : typeof data.error === 'string'
            ? data.error
            : 'Retell API error'
      return NextResponse.json({ error: msg, details: data }, { status: res.status })
    }

    const accessToken = data.access_token as string | undefined
    const callId = data.call_id as string | undefined
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Retell did not return access_token' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      accessToken,
      callId,
      callType: data.call_type,
    })
  } catch (error) {
    console.error('[Retell web-call]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
