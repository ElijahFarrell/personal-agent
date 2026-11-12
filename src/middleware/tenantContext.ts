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

/** Thrown when Clerk is configured and the request has no signed-in user. */
export class UnauthenticatedError extends Error {
  readonly status = 401

  constructor() {
    super('Unauthorized')
    this.name = 'UnauthenticatedError'
  }
}

export function httpStatusForError(error: unknown, fallback = 500): number {
  return error instanceof UnauthenticatedError ? 401 : fallback
}

/**
 * Read the Clerk session.
 * Returns null when Clerk is not configured (local personal mode).
 * Throws {@link UnauthenticatedError} when Clerk is configured and nobody is signed in.
 */
export async function readClerkSession(): Promise<{
  userId: string
  orgId: string | null
} | null> {
  try {
    const { userId, orgId } = await auth()
    if (!userId) throw new UnauthenticatedError()
    return { userId, orgId: orgId ?? null }
  } catch (error) {
    if (error instanceof UnauthenticatedError) throw error
    return null
  }
}

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
 * Falls back to personal context only when Clerk itself is not configured.
 * A configured Clerk app with no session throws {@link UnauthenticatedError}
 * so API routes do not run tools as TELEGRAM_OWNER_ID.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await readClerkSession()
  if (!session) return PERSONAL_CONTEXT

  const { userId, orgId } = session
  const tenantKey = orgId ?? userId

  try {
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
}

