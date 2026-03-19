import { NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { getComposioConnectionStatus } from '@/lib/composio'

/**
 * GET /api/composio/status
 * Returns connection status for all Composio-backed providers for the current user.
 */
export async function GET() {
  try {
    const { userId } = await getTenantContext()
    const status = await getComposioConnectionStatus(userId)
    return NextResponse.json(status)
  } catch (error) {
    console.error('[Composio Status] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
