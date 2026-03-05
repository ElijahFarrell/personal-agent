import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { config } from '@/lib/config'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const botUsername = config.telegram.botUsername
    if (!botUsername) {
      return NextResponse.json(
        { error: 'Telegram integration is not configured' },
        { status: 503 }
      )
    }

    const { token } = await convex.mutation(api.telegram.createLinkToken, {
      clerkUserId: userId,
    })

    return NextResponse.json({ token, botUsername })
  } catch (error) {
    console.error('[Telegram Link] Error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to create link token'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
