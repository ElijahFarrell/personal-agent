import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { getAuthorizeUrl } from '@/lib/composio'
import { isIntegrationAllowed } from '@/constants/featureGating'

const COMPOSIO_TOOLKIT_BY_PROVIDER: Record<string, 'APOLLO' | 'OUTLOOK'> = {
  apollo: 'APOLLO',
  outlook: 'OUTLOOK',
}

/**
 * POST /api/composio/authorize
 * Body: { provider: 'apollo' | 'outlook' }
 * Returns: { redirectUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext()
    const { userId, config } = tenantCtx

    const body = (await req.json()) as { provider?: string }
    const provider = body.provider?.toLowerCase()
    const toolkit = provider ? COMPOSIO_TOOLKIT_BY_PROVIDER[provider] : null

    if (!toolkit || !provider) {
      return NextResponse.json(
        { error: 'provider must be "apollo" or "outlook"' },
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

    const redirectUrl = await getAuthorizeUrl(userId, toolkit, callbackUrl)

    return NextResponse.json({ redirectUrl })
  } catch (error) {
    console.error('[Composio Authorize] Error:', error)
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
