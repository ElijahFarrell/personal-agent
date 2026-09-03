import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'
import { getTravelQueue } from '@/services/replyOs/queue'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  try {
    const { userId, config } = await getTenantContext()
    if (!isFeatureEnabled(config, 'sellerReplyOs')) {
      return NextResponse.json(
        { error: 'Seller Reply OS is not enabled.' },
        { status: 403 }
      )
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const items = await getTravelQueue(dbUser.tenantId)
    return NextResponse.json({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load queue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
