'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ComposioConnectButton } from '@/components/ComposioConnectButton'
import { TelegramConnectButton } from '@/components/TelegramConnectButton'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isIntegrationAllowed } from '@/constants/featureGating'
import type { ComposioProvider } from '@/types'
import { Lock, Send } from 'lucide-react'
import { API_ROUTES } from '@/constants/api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { COMPOSIO_PROVIDERS } from '@/lib/composioMappings'
import {
  INTEGRATION_CATALOG,
  INTEGRATION_CATEGORY_LABELS,
  INTEGRATION_CATEGORY_ORDER,
} from '@/constants/integrationsCatalog'

const TELEGRAM_ENTRY = {
  id: 'telegram',
  name: 'Telegram',
  description: 'Chat with your AI assistant from Telegram',
  Icon: Send,
  iconBg: 'bg-sky-500/10',
  iconColor: 'text-sky-400',
}

export default function IntegrationsPage() {
  const { user } = useUser()
  const { config } = useOrgConfig()
  const [composioStatus, setComposioStatus] = useState<Record<string, boolean>>({})

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const refreshComposioStatus = useCallback(() => {
    fetch(API_ROUTES.composioStatus)
      .then((r) => r.json())
      .then((data) => setComposioStatus(data))
      .catch(() => setComposioStatus({}))
  }, [])

  useEffect(() => {
    refreshComposioStatus()
  }, [refreshComposioStatus])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('composio') === 'connected') {
      refreshComposioStatus()
      window.history.replaceState({}, '', '/dashboard/integrations')
    }
  }, [refreshComposioStatus])

  const connectedCount =
    COMPOSIO_PROVIDERS.filter((p) => composioStatus[p]).length +
    (!!dbUser?.telegramId ? 1 : 0)

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof INTEGRATION_CATALOG>()
    for (const entry of INTEGRATION_CATALOG) {
      const list = map.get(entry.category) ?? []
      list.push(entry)
      map.set(entry.category, list)
    }
    return map
  }, [])

  function renderIntegrationCard(
    id: string,
    name: string,
    description: string,
    provider: string,
    Icon: React.ElementType,
    iconBg: string,
    iconColor: string
  ) {
    const isConnected = !!composioStatus[provider]
    const locked = !isIntegrationAllowed(config, provider)
    return (
      <div
        key={id}
        className={`flex flex-col rounded-xl border border-gray-800/60 bg-gray-900/40 p-5 transition-colors ${
          locked ? 'opacity-60' : 'hover:border-gray-700/60'
        }`}
      >
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
            aria-hidden="true"
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white">{name}</p>
              {locked && (
                <span className="flex items-center gap-1 rounded-full bg-gray-600/20 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                  <Lock className="h-2.5 w-2.5" />
                  Locked
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <div className="mt-4">
          {locked ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-xs text-gray-500">
              <Lock className="h-3.5 w-3.5" />
              Contact admin to request access
            </span>
          ) : (
            <ComposioConnectButton
              provider={provider as ComposioProvider}
              isConnected={isConnected}
              onSuccess={refreshComposioStatus}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white text-wrap-balance">
            Integrations
          </h1>
          <p className="mt-1 text-[15px] text-gray-400">
            Connect your accounts to power your AI assistant.{' '}
            <span className="tabular-nums text-gray-500">
              {connectedCount} of {INTEGRATION_CATALOG.length + 1} connected
            </span>
          </p>
        </div>

        {INTEGRATION_CATEGORY_ORDER.map((categoryId) => {
          const entries = byCategory.get(categoryId)
          if (!entries?.length) return null
          return (
            <section
              key={categoryId}
              aria-label={INTEGRATION_CATEGORY_LABELS[categoryId]}
              className="space-y-4"
            >
              <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                {INTEGRATION_CATEGORY_LABELS[categoryId]}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map(
                  ({ id, name, description, provider, Icon, iconBg, iconColor }) =>
                    renderIntegrationCard(
                      id,
                      name,
                      description,
                      provider,
                      Icon,
                      iconBg,
                      iconColor
                    )
                )}
              </div>
            </section>
          )
        })}

        <section aria-label="Assistant" className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Assistant
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col rounded-xl border border-gray-800/60 bg-gray-900/40 p-5 transition-colors hover:border-gray-700/60">
              <div className="flex min-w-0 items-start gap-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TELEGRAM_ENTRY.iconBg}`}
                  aria-hidden="true"
                >
                  <TELEGRAM_ENTRY.Icon className={`h-5 w-5 ${TELEGRAM_ENTRY.iconColor}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{TELEGRAM_ENTRY.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                    {TELEGRAM_ENTRY.description}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <TelegramConnectButton isConnected={!!dbUser?.telegramId} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
