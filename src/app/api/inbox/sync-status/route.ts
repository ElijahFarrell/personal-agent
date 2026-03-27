import { NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  try {
    const tenantCtx = await getTenantContext()
    const { userId, config } = tenantCtx

    if (!isFeatureEnabled(config, 'unifiedInbox')) {
      return NextResponse.json({
        enabled: false,
        usedToday: 0,
        limit: config.limits.maxInboxSyncPerDay,
      })
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const usedToday = await convex.query(api.inboxSyncUsage.getCountForUserToday, {
      userId: dbUser._id,
    })

    return NextResponse.json({
      enabled: true,
      usedToday,
      limit: config.limits.maxInboxSyncPerDay,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
