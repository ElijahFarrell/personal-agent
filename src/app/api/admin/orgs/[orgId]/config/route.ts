import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { assertSuperAdmin } from '@/middleware/adminGuard'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth()
    assertSuperAdmin(userId)

    const { orgId } = await params
    const config = await convex.query(api.tenantConfigs.getByTenantId, {
      tenantId: orgId as Id<'tenants'>,
    })

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 })
    }

    return NextResponse.json(config)
  } catch (err) {
    if (err instanceof Response) throw err
    console.error('[Admin Config GET]', err)
    return NextResponse.json(
      { error: 'Failed to get config' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth()
    assertSuperAdmin(userId)

    const { orgId } = await params
    const body = await req.json()

    const {
      allowedAgents,
      allowedIntegrations,
      features,
      limits,
      billingModel,
      adminNotes,
      nicheId,
      nicheOverrides,
      fullPlatformAccess,
      orgReplyVoice,
      metricAssumptions,
    } = body

    if (
      !allowedAgents ||
      !allowedIntegrations ||
      !features ||
      !limits ||
      !billingModel
    ) {
      return NextResponse.json(
        { error: 'allowedAgents, allowedIntegrations, features, limits, billingModel required' },
        { status: 400 }
      )
    }

    await convex.mutation(api.tenantConfigs.upsertConfig, {
      tenantId: orgId as Id<'tenants'>,
      allowedAgents:
        allowedAgents === 'all' ? 'all' : (allowedAgents as string[]),
      allowedIntegrations:
        allowedIntegrations === 'all' ? 'all' : (allowedIntegrations as string[]),
      features: {
        customWorkflows: !!features.customWorkflows,
        deepResearch: !!features.deepResearch,
        outreachCampaigns: !!features.outreachCampaigns,
        prospectTable: !!features.prospectTable,
        exaWebsets: !!features.exaWebsets,
        crmSync: !!features.crmSync,
        customSkills: !!features.customSkills,
        voiceMode: !!features.voiceMode,
        workflowBuilder: !!features.workflowBuilder,
        scheduledTasks: !!features.scheduledTasks,
        videoStudio: !!features.videoStudio,
        unifiedInbox: !!features.unifiedInbox,
        eventTriggers: !!features.eventTriggers,
        leadScoring: !!features.leadScoring,
      },
      limits: {
        maxMembers: Number(limits.maxMembers) ?? 1,
        maxProspectsPerMonth: Number(limits.maxProspectsPerMonth) ?? 10,
        maxWorkflows: Number(limits.maxWorkflows) ?? 1,
        maxSchedules: Number(limits.maxSchedules) ?? 1,
        maxSkills: Number(limits.maxSkills) ?? 5,
        monthlyCredits: Number(limits.monthlyCredits) ?? 10,
        maxVideoGenerationsPerMonth: Number(limits.maxVideoGenerationsPerMonth) ?? 20,
        maxInboxSyncPerDay: Number(limits.maxInboxSyncPerDay) ?? 50,
      },
      billingModel: billingModel as
        | 'unlimited'
        | 'flat'
        | 'usage'
        | 'flat_plus_usage'
        | 'trial'
        | 'friend',
      adminNotes: adminNotes as string | undefined,
      nicheId: nicheId as 'generic' | 'real_estate' | undefined,
      nicheOverrides: nicheOverrides as
        | { orchestratorAddendum?: string }
        | undefined,
      fullPlatformAccess: fullPlatformAccess as boolean | undefined,
      orgReplyVoice: orgReplyVoice as string | undefined,
      metricAssumptions: metricAssumptions as
        | {
            researchMinutesPerProspectSnapshot?: number
            researchMinutesPerAdsRun?: number
            minutesPerOutreachSend?: number
            minutesPerInboxReply?: number
            minutesPerPersonalizedOutreach?: number
          }
        | undefined,
      updatedBy: userId!,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Response) throw err
    console.error('[Admin Config PUT]', err)
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    )
  }
}
