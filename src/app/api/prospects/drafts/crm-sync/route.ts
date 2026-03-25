import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { getTenantContext } from '@/middleware/tenantContext'
import { getComposioConnectionStatus } from '@/lib/composio'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const CRM_PROVIDERS = ['hubspot', 'salesforce', 'zoho-crm', 'pipedrive'] as const

/**
 * POST /api/prospects/drafts/crm-sync — mark draft as CRM-synced when user has CRM connected.
 * Uses Composio for connection status.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId } = tenantCtx

    const { draftId } = (await req.json()) as { draftId?: string }
    if (!draftId) {
      return NextResponse.json({ error: 'draftId is required' }, { status: 400 })
    }

    const draft = await convex.query(api.prospects.getDraft, {
      draftId: draftId as Id<'outreachDrafts'>,
    })
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const prospect = await convex.query(api.prospects.getProspect, {
      prospectId: draft.prospectId,
    })
    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    const composioStatus = await getComposioConnectionStatus(userId)
    const connectedCrms = CRM_PROVIDERS.filter(
      (p) => composioStatus[p as keyof typeof composioStatus]
    )

    if (connectedCrms.length === 0) {
      return NextResponse.json({
        success: false,
        reason: 'No CRM integration connected',
      })
    }

    const noteContent = [
      `Outreach via ${draft.channel} — ${draft.status}`,
      draft.subject ? `Subject: ${draft.subject}` : null,
      `Message:\n${draft.body}`,
      draft.sentAt ? `Sent at: ${new Date(draft.sentAt).toISOString()}` : null,
    ]
      .filter(Boolean)
      .join('\n\n')

    await convex.mutation(api.prospects.updateDraftStatus, {
      draftId: draftId as Id<'outreachDrafts'>,
      crmSynced: true,
    })

    return NextResponse.json({
      success: true,
      crmProviders: connectedCrms,
      note: noteContent,
    })
  } catch (error) {
    console.error('[CRM Sync API] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
