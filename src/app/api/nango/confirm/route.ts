import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { findConnectionId, getConnection } from '@/services/nangoService'
import { api } from '@convex/_generated/api'
import type { IntegrationProvider } from '@/types'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Called by the frontend after a successful `nango.auth()` flow.
 * Discovers the real Nango connectionId, verifies credentials exist,
 * and upserts the Convex integration record immediately.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId, orgId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider } = (await req.json()) as { provider?: string }
    if (!provider) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    }

    console.log(`[Nango Confirm] provider=${provider} clerkUserId=${clerkUserId}`)

    const connectionId = await findConnectionId(provider as IntegrationProvider, clerkUserId)
    console.log(`[Nango Confirm] discovered connectionId=${connectionId ?? 'none'}`)

    if (!connectionId) {
      console.warn(`[Nango Confirm] No connection found for ${provider}/${clerkUserId}`)
      return NextResponse.json({ connected: false })
    }

    const creds = await getConnection(provider as IntegrationProvider, clerkUserId)
    console.log(`[Nango Confirm] credentials found=${!!creds}`)

    if (!creds) {
      return NextResponse.json({ connected: false })
    }

    const { userId, tenantId } = await convex.mutation(api.users.ensureUser, {
      clerkUserId,
      email: `${clerkUserId}@placeholder.local`,
      name: clerkUserId,
      orgId: orgId ?? undefined,
    })

    await convex.mutation(api.integrations.upsertIntegration, {
      userId,
      tenantId,
      provider,
      connectionId,
    })

    console.log(`[Nango Confirm] Upserted integration for ${provider} connectionId=${connectionId}`)
    return NextResponse.json({ connected: true })
  } catch (error) {
    console.error('[Nango Confirm] Error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
