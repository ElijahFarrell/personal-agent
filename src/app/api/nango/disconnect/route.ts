import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { deleteConnection } from '@/services/nangoService'
import type { IntegrationProvider } from '@/types'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider } = (await req.json()) as { provider: IntegrationProvider }
    if (!provider) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    }

    await deleteConnection(provider, userId).catch((err) => {
      console.warn('[Nango Disconnect] Nango deletion failed (continuing):', (err as Error).message)
    })

    const dbUser = await convex.query(api.users.getUserByClerkUserId, { clerkUserId: userId })
    if (dbUser) {
      await convex.mutation(api.integrations.deleteIntegrationByProvider, {
        userId: dbUser._id,
        provider,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Nango Disconnect] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to disconnect'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
