import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { TenantContext, PlanTier } from '@/types'
import { DEFAULT_CONFIG } from '@/constants/featureGating'
import { tenantConfigFromConvexRow } from '@/lib/convexTenantConfig'
import {
  accessContextFromTenantRow,
  resolvePlatformConfig,
  tenantConfigForResolvedGates,
} from '@/platform/niche'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/** Default personal-use context (no Clerk required for Telegram personal mode). */
export const PERSONAL_CONTEXT: TenantContext = {
  tenantId: 'personal',
  userId: process.env.TELEGRAM_OWNER_ID ?? 'owner',
  tier: 'pro',
  config: DEFAULT_CONFIG,
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
 * Resolve org config from Convex. Falls back to DEFAULT_CONFIG when none exists.
 */
async function resolveConfig(
  tenantConvexId: Id<'tenants'>,
  clerkUserId: string,
  clerkOrgId: string
) {
  try {
    const row = await convex.query(api.tenantConfigs.getByTenantId, {
      tenantId: tenantConvexId,
    })
    const base = tenantConfigFromConvexRow(row)
    const resolved = resolvePlatformConfig(
      accessContextFromTenantRow(clerkUserId, clerkOrgId, base)
    )
    return tenantConfigForResolvedGates(base, resolved)
  } catch {
    return tenantConfigForResolvedGates(
      DEFAULT_CONFIG,
      resolvePlatformConfig(
        accessContextFromTenantRow(clerkUserId, clerkOrgId, DEFAULT_CONFIG)
      )
    )
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
    const tenant = await convex.query(api.tenants.getTenantByClerkOrgId, {
      clerkOrgId: tenantKey,
    })
    if (!tenant) {
      const resolved = resolvePlatformConfig(
        accessContextFromTenantRow(userId, tenantKey, DEFAULT_CONFIG)
      )
      return {
        tenantId: tenantKey,
        userId,
        tier: 'free',
        config: tenantConfigForResolvedGates(DEFAULT_CONFIG, resolved),
      }
    }

    const tier = await resolveTier(tenantKey)
    const config = await resolveConfig(tenant._id, userId, tenantKey)

    return {
      tenantId: tenantKey,
      userId,
      tier,
      config,
    }
  } catch {
    return PERSONAL_CONTEXT
  }
}

