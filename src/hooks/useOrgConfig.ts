'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  DEFAULT_CONFIG,
  type NicheId,
  type TenantConfig,
} from '@/constants/featureGating'

export interface UseOrgConfigResult {
  config: TenantConfig
  isOnTrial: boolean
  billing: { creditBalance: number; trialEndsAt?: number; [key: string]: unknown } | null
  tenantId: Id<'tenants'> | null
  isLoading: boolean
}

/**
 * Loads the current org's config and billing. Falls back to DEFAULT_CONFIG when
 * no tenantConfigs row exists. Config changes from the admin dashboard propagate
 * in real time via Convex subscriptions.
 */
export function useOrgConfig(): UseOrgConfigResult {
  const { user } = useUser()
  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )
  const tenantConfig = useQuery(
    api.tenantConfigs.getByTenantId,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )
  const billing = useQuery(
    api.billing.getBillingByTenantId,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const [effectiveGating, setEffectiveGating] = useState<{
    allowedAgents: 'all' | string[]
    features: TenantConfig['features']
    fullPlatformAccess: boolean
    nicheId: NicheId
  } | null>(null)

  useEffect(() => {
    if (!user) {
      setEffectiveGating(null)
      return
    }
    let cancelled = false
    fetch('/api/platform/effective-config', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: {
          allowedAgents?: 'all' | string[]
          features?: TenantConfig['features']
          fullPlatformAccess?: boolean
          nicheId?: NicheId
        } | null) => {
          if (cancelled || !data?.features) return
          setEffectiveGating({
            allowedAgents: data.allowedAgents ?? DEFAULT_CONFIG.allowedAgents,
            features: data.features,
            fullPlatformAccess: data.fullPlatformAccess === true,
            nicheId: data.nicheId ?? 'generic',
          })
        }
      )
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const isLoading = user !== undefined && dbUser === undefined
  const config: TenantConfig = useMemo(() => {
    const base: TenantConfig = tenantConfig
      ? {
          allowedAgents: tenantConfig.allowedAgents,
          allowedIntegrations: tenantConfig.allowedIntegrations,
          features: { ...DEFAULT_CONFIG.features, ...tenantConfig.features },
          limits: { ...DEFAULT_CONFIG.limits, ...tenantConfig.limits },
          billingModel: tenantConfig.billingModel,
          nicheId: tenantConfig.nicheId ?? 'generic',
          nicheOverrides: tenantConfig.nicheOverrides,
          fullPlatformAccess: tenantConfig.fullPlatformAccess,
          orgReplyVoice: tenantConfig.orgReplyVoice,
        }
      : DEFAULT_CONFIG
    if (!effectiveGating) return base
    return {
      ...base,
      allowedAgents: effectiveGating.allowedAgents,
      features: effectiveGating.features,
      fullPlatformAccess: effectiveGating.fullPlatformAccess,
      nicheId: effectiveGating.nicheId,
    }
  }, [tenantConfig, effectiveGating])

  const isOnTrial =
    !!billing?.trialEndsAt && billing.trialEndsAt > Date.now()

  return {
    config,
    isOnTrial,
    billing: billing ?? null,
    tenantId: dbUser?.tenantId ?? null,
    isLoading,
  }
}
