'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  DEFAULT_CONFIG,
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

  const isLoading = user !== undefined && dbUser === undefined
  const config: TenantConfig = tenantConfig
    ? {
        allowedAgents: tenantConfig.allowedAgents,
        allowedIntegrations: tenantConfig.allowedIntegrations,
        features: tenantConfig.features,
        limits: tenantConfig.limits,
        billingModel: tenantConfig.billingModel,
      }
    : DEFAULT_CONFIG

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
