import { NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { getComposioConnectionStatus } from '@/lib/composio'

/**
 * GET /api/composio/status
 * Returns: { [provider]: boolean } for all Composio-backed providers
 */
export async function GET() {
  try {
    const tenantCtx = await getTenantContext()
    const { userId } = tenantCtx

    const status = await getComposioConnectionStatus(userId)

    return NextResponse.json(status)
  } catch (error) {
    console.error('[Composio Status] Error:', error)
    return NextResponse.json({}, { status: 200 })
  }
}
