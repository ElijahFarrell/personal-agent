import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { UnipileProvider } from '@/lib/unipile'
import { config } from '@/lib/config'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

type UnipileAccountStatus = 'operational' | 'credentials_required' | 'paused'

function verifyWebhook(req: NextRequest): boolean {
  const secret = config.unipile.webhookSecret.trim()
  if (!secret) return true
  const sig =
    req.headers.get('x-unipile-signature') ??
    req.headers.get('x-webhook-signature') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return sig === secret
}

function mapProvider(raw: string): UnipileProvider | null {
  const value = raw.toLowerCase()
  if (value.includes('linkedin')) return 'linkedin'
  if (value.includes('whatsapp')) return 'whatsapp'
  return null
}

function mapStatus(raw: string): UnipileAccountStatus {
  const value = raw.toUpperCase()
  if (
    value.includes('CREDENTIALS') ||
    value.includes('DISCONNECTED') ||
    value.includes('RECONNECT')
  ) {
    return 'credentials_required'
  }
  if (value.includes('PAUSED')) return 'paused'
  return 'operational'
}

/**
 * POST /api/webhooks/unipile/account
 * Handles Hosted Auth callbacks and account status updates.
 */
export async function POST(req: NextRequest) {
  if (!verifyWebhook(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as Record<string, unknown>
    const accountId = String(body.account_id ?? body.accountId ?? '')
    const clerkUserId = String(body.name ?? body.user_id ?? body.userId ?? '')
    const provider = mapProvider(
      String(body.provider ?? body.account_type ?? body.type ?? '')
    )
    const status = mapStatus(String(body.status ?? 'CREATION_SUCCESS'))

    if (!accountId || !clerkUserId || !provider) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: 'missing_account_or_user_or_provider',
      })
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, { clerkUserId })
    if (!dbUser) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: 'user_not_found',
      })
    }

    await convex.mutation(api.unipileAccounts.upsert, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      provider,
      externalAccountId: accountId,
      status,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[unipile/account-webhook]', error)
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }
}
