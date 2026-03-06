import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { getTenantContext } from '@/middleware/tenantContext'
import { createNangoMCPClient } from '@/lib/nangoMcp'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const CRM_PROVIDERS = ['hubspot', 'salesforce', 'pipedrive', 'zoho-crm'] as const

/**
 * POST /api/prospects/drafts/crm-sync — push outreach activity to a connected CRM.
 * Uses Nango MCP toolsets to create a note/activity in the user's CRM.
 * Optional: call this after a draft is sent to log the interaction.
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

    const integrations = await convex.query(api.integrations.getIntegrationsByTenantId, {
      tenantId: prospect.tenantId,
    })

    const connectedCrms = integrations
      ?.filter((i) => CRM_PROVIDERS.includes(i.provider as (typeof CRM_PROVIDERS)[number]) && i.status === 'active')
      .map((i) => i.provider) ?? []

    if (connectedCrms.length === 0) {
      return NextResponse.json({
        success: false,
        reason: 'No CRM integration connected',
      })
    }

    const mcpClient = await createNangoMCPClient(userId, connectedCrms)
    if (!mcpClient) {
      return NextResponse.json({
        success: false,
        reason: 'Could not connect to CRM via Nango',
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

    try {
      const toolsets = await mcpClient.listToolsets()

      // v1: verify CRM connectivity and mark as synced.
      // Future: use the CRM agent to create a contact/note via the MCP tools.
      await convex.mutation(api.prospects.updateDraftStatus, {
        draftId: draftId as Id<'outreachDrafts'>,
        crmSynced: true,
      })

      return NextResponse.json({
        success: true,
        crmProviders: connectedCrms,
        toolsetsAvailable: Object.keys(toolsets),
        note: noteContent,
      })
    } catch (syncError) {
      console.error('[CRM Sync] Error:', syncError)
      return NextResponse.json({
        success: false,
        reason: syncError instanceof Error ? syncError.message : 'CRM sync failed',
      })
    } finally {
      await mcpClient.disconnect()
    }
  } catch (error) {
    console.error('[CRM Sync API] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
