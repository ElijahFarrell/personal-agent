import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import { isIntegrationAllowed } from '@/constants/featureGating'
import type { UnipileProvider } from '@/lib/unipile'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/unipile/disconnect
 * Body: { provider: "linkedin" | "whatsapp" }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId, config: tenantConfig } = await getTenantContext()
    const body = (await req.json()) as { provider?: string }
    const provider = body.provider?.toLowerCase() as UnipileProvider | undefined

    if (provider !== 'linkedin' && provider !== 'whatsapp') {
      return NextResponse.json(
        { error: 'provider must be linkedin or whatsapp' },
        { status: 400 }
      )
    }

    if (!isIntegrationAllowed(tenantConfig, provider)) {
      return NextResponse.json(
        { error: `${provider} is not available for your organization` },
        { status: 403 }
      )
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const result = await convex.mutation(api.unipileAccounts.remove, {
      userId: dbUser._id,
      provider,
    })

    return NextResponse.json({ disconnected: result.removed ? 1 : 0 })
  } catch (error) {
    console.error('[Unipile Disconnect] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
