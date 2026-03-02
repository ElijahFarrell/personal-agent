import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createConnectSession } from '@/services/nangoService'

export async function POST() {
  try {
    const { userId, orgId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await createConnectSession(userId, orgId ?? userId)

    return NextResponse.json({ sessionToken: token })
  } catch (error) {
    console.error('[Nango Session] Error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to create session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
