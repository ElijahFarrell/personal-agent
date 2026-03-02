import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { TenantContext, PlanTier } from '@/types'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/** Default personal-use context (no Clerk required for Telegram personal mode). */
export const PERSONAL_CONTEXT: TenantContext = {
  tenantId: 'personal',
  userId: process.env.TELEGRAM_OWNER_ID ?? 'owner',
  tier: 'pro',
}

/**
 * Resolve the effective tier for a tenant from the DB.
 * If on an active trial, returns 'pro'. If trial expired, returns 'free'.
 */
async function resolveTier(clerkOrgOrUserId: string): Promise<PlanTier> {
  try {
    const tenant = await convex.query(api.tenants.getTenantByClerkOrgId, {
      clerkOrgId: clerkOrgOrUserId,
    })
    if (!tenant) return 'free'

    const billing = await convex.query(api.billing.getBillingByTenantId, {
      tenantId: tenant._id,
    })

    if (billing?.trialEndsAt && billing.trialEndsAt > Date.now()) {
      return 'pro'
    }

    return tenant.tier as PlanTier
  } catch {
    return 'free'
  }
}

/**
 * Extract tenant context from an authenticated Clerk session.
 * Falls back to personal context if Clerk is not configured.
 */
export async function getTenantContext(): Promise<TenantContext> {
  try {
    const { userId, orgId } = await auth()

    if (!userId) return PERSONAL_CONTEXT

    const tenantKey = orgId ?? userId
    const tier = await resolveTier(tenantKey)

    return {
      tenantId: tenantKey,
      userId,
      tier,
    }
  } catch {
    return PERSONAL_CONTEXT
  }
}

/**
 * Build a tenant context for Telegram messages based on the sender's Telegram user ID.
 * Maps Telegram IDs to internal user IDs — in production, look this up in the DB.
 */
export function getTelegramContext(telegramUserId: string): TenantContext {
  const ownerId = process.env.TELEGRAM_OWNER_ID
  if (telegramUserId === ownerId) return PERSONAL_CONTEXT

  return {
    tenantId: `telegram-${telegramUserId}`,
    userId: telegramUserId,
    tier: 'free',
  }
}
