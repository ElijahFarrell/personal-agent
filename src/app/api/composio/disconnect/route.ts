import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { disconnectComposioProvider } from '@/lib/composio'
import { isIntegrationAllowed } from '@/constants/featureGating'
import { getToolkitForProvider } from '@/lib/composioMappings'
import type { ComposioProvider } from '@/types'

/**
 * POST /api/composio/disconnect
 * Body: { provider: string } — same values as authorize (e.g. gmail, pipedrive)
 * Removes the user's Composio connection for that toolkit so they can connect again.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId, config } = tenantCtx

    const body = (await req.json()) as { provider?: string }
    const provider = body.provider?.toLowerCase() as ComposioProvider | undefined

    if (!provider) {
      return NextResponse.json(
        { error: 'provider is required' },
        { status: 400 }
      )
    }

    const toolkit = getToolkitForProvider(provider)
    if (!toolkit) {
      return NextResponse.json(
        { error: `Unknown or unsupported provider: ${provider}` },
        { status: 400 }
      )
    }

    if (!isIntegrationAllowed(config, provider)) {
      return NextResponse.json(
        { error: `${provider} is not available for your organization` },
        { status: 403 }
      )
    }

    const { disconnected } = await disconnectComposioProvider(userId, provider)

    return NextResponse.json({ disconnected })
  } catch (error) {
    console.error('[Composio Disconnect] Error:', error)
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
