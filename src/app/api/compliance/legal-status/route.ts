import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import { LEGAL_DOC_VERSION } from '@/constants/compliancePolicies'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  try {
    const { userId } = await getTenantContext()
    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const status = await convex.query((api as any).compliance.getLegalAcceptanceStatus, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      requiredVersion: LEGAL_DOC_VERSION,
    })
    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load legal status' },
      { status: 500 }
    )
  }
}
