import { NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { getComposioConnectionStatus } from '@/lib/composio'

/**
 * GET /api/composio/status
 * Returns: { apollo: boolean, outlook: boolean }
 */
export async function GET() {
  try {
    const tenantCtx = await getTenantContext()
    const { userId } = tenantCtx

    const status = await getComposioConnectionStatus(userId)

    return NextResponse.json({
      apollo: status.APOLLO,
      outlook: status.OUTLOOK,
    })
  } catch (error) {
    console.error('[Composio Status] Error:', error)
    return NextResponse.json(
      { apollo: false, outlook: false },
      { status: 200 }
    )
  }
}
