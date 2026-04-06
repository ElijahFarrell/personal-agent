import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { isIntegrationAllowed } from '@/constants/featureGating'
import { createHostedAuthLink, type UnipileProvider } from '@/lib/unipile'
import { config } from '@/lib/config'

/**
 * POST /api/unipile/authorize
 * Body: { provider: "linkedin" | "whatsapp" }
 * Returns: { redirectUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, config: tenantConfig } = await getTenantContext()
    const body = (await req.json()) as { provider?: string }
    const provider = body.provider?.toLowerCase() as UnipileProvider | undefined

    if (provider !== 'linkedin' && provider !== 'whatsapp') {
      return NextResponse.json(
        { error: 'provider must be linkedin or whatsapp' },
        { status: 400 }
      )
    }

    if (!isIntegrationAllowed(tenantConfig, provider)) {
      return NextResponse.json(
        { error: `${provider} is not available for your organization` },
        { status: 403 }
      )
    }

    const appUrl = config.app.url
    const redirectUrl = await createHostedAuthLink({
      provider,
      clerkUserId: userId,
      notifyUrl: `${appUrl}/api/webhooks/unipile/account`,
      successRedirectUrl: `${appUrl}/dashboard/integrations?unipile=connected`,
      failureRedirectUrl: `${appUrl}/dashboard/integrations?unipile=failed`,
      expiresOn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })

    return NextResponse.json({ redirectUrl })
  } catch (error) {
    console.error('[Unipile Authorize] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
