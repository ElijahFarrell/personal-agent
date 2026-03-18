import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { getAuthorizeUrl } from '@/lib/composio'
import { isIntegrationAllowed } from '@/constants/featureGating'
import { getToolkitForProvider } from '@/lib/composioMappings'
import type { ComposioProvider } from '@/types'

/**
 * POST /api/composio/authorize
 * Body: { provider: string } — e.g. gmail, slack, apollo, outlook
 * Returns: { redirectUrl: string }
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const callbackUrl = `${appUrl}/dashboard/integrations?composio=connected`

    const redirectUrl = await getAuthorizeUrl(userId, provider, callbackUrl)

    return NextResponse.json({ redirectUrl })
  } catch (error) {
    console.error('[Composio Authorize] Error:', error)
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
