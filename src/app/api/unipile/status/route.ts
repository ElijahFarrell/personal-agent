import { NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { getUnipileConnectionStatus } from '@/services/unipileService'

/**
 * GET /api/unipile/status
 * Returns connection status for LinkedIn and WhatsApp Unipile accounts.
 */
export async function GET() {
  try {
    const { userId } = await getTenantContext()
    const status = await getUnipileConnectionStatus(userId)
    return NextResponse.json(status)
  } catch (error) {
    console.error('[Unipile Status] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
