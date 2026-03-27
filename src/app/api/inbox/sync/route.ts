import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { syncUnifiedInboxForUser } from '@/services/inboxSyncService'
import { rescoreTenantProspectsFromInbox } from '@/services/leadScoringService'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(_req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId, config } = tenantCtx

    if (!isFeatureEnabled(config, 'unifiedInbox')) {
      return NextResponse.json(
        { error: 'Unified inbox is not enabled for your organization.' },
        { status: 403 }
      )
    }

    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch(() => null)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const usedToday = await convex.query(api.inboxSyncUsage.getCountForUserToday, {
      userId: dbUser._id,
    })

    const maxSync = config.limits.maxInboxSyncPerDay
    if (maxSync >= 0 && usedToday >= maxSync) {
      return NextResponse.json(
        {
          error: `Daily inbox sync limit reached (${maxSync}). Try again tomorrow.`,
        },
        { status: 429 }
      )
    }

    const userEmailLower = dbUser.email.toLowerCase().trim()
    const result = await syncUnifiedInboxForUser({
      clerkUserId: userId,
      dbUserId: dbUser._id,
      tenantId: dbUser.tenantId,
      userEmailLower,
    })

    await convex.mutation(api.inboxSyncUsage.incrementSyncCount, {
      userId: dbUser._id,
    })

    if (isFeatureEnabled(config, 'leadScoring')) {
      try {
        await rescoreTenantProspectsFromInbox({
          tenantId: dbUser.tenantId,
          inboxUserId: dbUser._id,
        })
      } catch (e) {
        console.warn('[inbox/sync] lead scoring skipped:', e)
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
