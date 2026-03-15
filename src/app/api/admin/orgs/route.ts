import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { assertSuperAdmin } from '@/middleware/adminGuard'
import { DEFAULT_CONFIG } from '@/constants/featureGating'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  try {
    const { userId } = await auth()
    assertSuperAdmin(userId)

    const results = await convex.query(api.tenantConfigs.listAll)
    return NextResponse.json(results)
  } catch (err) {
    if (err instanceof Response) throw err
    console.error('[Admin Orgs GET]', err)
    return NextResponse.json(
      { error: 'Failed to list orgs' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    assertSuperAdmin(userId)

    const body = await req.json()
    const { name, trialDays } = body as { name: string; trialDays?: number }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const client = await clerkClient()
    const org = await client.organizations.createOrganization({
      name: name.trim(),
      createdBy: userId,
    })

    const tenantId = await convex.mutation(api.tenants.createTenant, {
      clerkOrgId: org.id,
      name: org.name,
      tier: 'pro',
    })

    if (trialDays && trialDays > 0) {
      await convex.mutation(api.billing.initializeTrial, {
        tenantId: tenantId as Id<'tenants'>,
      })
    } else {
      await convex.mutation(api.billing.initializeBilling, {
        tenantId: tenantId as Id<'tenants'>,
        initialCredits: 100,
      })
    }

    await convex.mutation(api.tenantConfigs.upsertConfig, {
      tenantId: tenantId as Id<'tenants'>,
      allowedAgents: DEFAULT_CONFIG.allowedAgents as 'all' | string[],
      allowedIntegrations: DEFAULT_CONFIG.allowedIntegrations as 'all' | string[],
      features: DEFAULT_CONFIG.features,
      limits: DEFAULT_CONFIG.limits,
      billingModel: trialDays && trialDays > 0 ? 'trial' : 'flat',
      updatedBy: userId!,
    })

    return NextResponse.json({
      orgId: org.id,
      tenantId,
      name: org.name,
    })
  } catch (err) {
    if (err instanceof Response) throw err
    console.error('[Admin Orgs POST]', err)
    return NextResponse.json(
      { error: 'Failed to create org' },
      { status: 500 }
    )
  }
}
