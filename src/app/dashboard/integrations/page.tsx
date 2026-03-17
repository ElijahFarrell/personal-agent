'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ConnectButton } from '@/components/ConnectButton'
import { ComposioConnectButton } from '@/components/ComposioConnectButton'
import { TelegramConnectButton } from '@/components/TelegramConnectButton'
import type { IntegrationProvider } from '@/types'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isIntegrationAllowed } from '@/constants/featureGating'
import { Lock } from 'lucide-react'
import {
  Mail,
  Calendar,
  MessageSquare,
  Linkedin,
  Camera,
  FileText,
  BarChart2,
  Send,
  Building2,
  TrendingUp,
  Database,
  Kanban,
  CheckSquare,
  LayoutGrid,
  MessageCircle,
  Table,
  Home,
  CreditCard,
  Calculator,
  Target,
  Inbox,
} from 'lucide-react'
import { API_ROUTES } from '@/constants/api'
import { useCallback, useEffect, useState } from 'react'

const INTEGRATIONS: Array<{
  id: string
  name: string
  description: string
  provider: IntegrationProvider
  Icon: React.ElementType
  iconBg: string
  iconColor: string
}> = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read and send emails on your behalf',
    provider: 'gmail',
    Icon: Mail,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Access and manage your calendar events',
    provider: 'google-calendar',
    Icon: Calendar,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send and read messages from your workspace',
    provider: 'slack',
    Icon: MessageSquare,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Manage your professional network',
    provider: 'linkedin',
    Icon: Linkedin,
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-400',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Schedule and publish content',
    provider: 'instagram',
    Icon: Camera,
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-400',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Read and write pages in your workspace',
    provider: 'notion',
    Icon: FileText,
    iconBg: 'bg-gray-500/10',
    iconColor: 'text-gray-300',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Manage contacts and CRM data',
    provider: 'hubspot',
    Icon: BarChart2,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'CRM, opportunities, and accounts',
    provider: 'salesforce',
    Icon: Building2,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Deals, contacts, and pipelines',
    provider: 'pipedrive',
    Icon: TrendingUp,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
  },
  {
    id: 'zoho-crm',
    name: 'Zoho CRM',
    description: 'Leads, contacts, and deals',
    provider: 'zoho-crm',
    Icon: Database,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Issues, projects, and sprints',
    provider: 'jira',
    Icon: Kanban,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Tasks, projects, and sections',
    provider: 'asana',
    Icon: CheckSquare,
    iconBg: 'bg-fuchsia-500/10',
    iconColor: 'text-fuchsia-400',
  },
  {
    id: 'monday',
    name: 'Monday.com',
    description: 'Boards, items, and updates',
    provider: 'monday',
    Icon: LayoutGrid,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    description: 'Messages, channels, and teams',
    provider: 'microsoft-teams',
    Icon: MessageCircle,
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Messages, channels, and members',
    provider: 'discord',
    Icon: MessageCircle,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    description: 'Search, read, and create documents',
    provider: 'google-docs',
    Icon: FileText,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    id: 'google-sheet',
    name: 'Google Sheets',
    description: 'Read, write, and create spreadsheets',
    provider: 'google-sheet',
    Icon: Table,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'List bases and create records',
    provider: 'airtable',
    Icon: Table,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  {
    id: 'follow-up-boss',
    name: 'Follow Up Boss',
    description: 'Real estate contacts, deals, and tasks',
    provider: 'follow-up-boss',
    Icon: Home,
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Event types and scheduled events',
    provider: 'calendly',
    Icon: Calendar,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Customers, charges, and invoices',
    provider: 'stripe',
    Icon: CreditCard,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Invoices, customers, and payments',
    provider: 'quickbooks',
    Icon: Calculator,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Audiences and campaigns',
    provider: 'mailchimp',
    Icon: Mail,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
  },
]

const COMPOSIO_INTEGRATIONS: Array<{
  id: string
  name: string
  description: string
  provider: 'apollo' | 'outlook'
  Icon: React.ElementType
  iconBg: string
  iconColor: string
}> = [
  {
    id: 'apollo',
    name: 'Apollo',
    description: 'Lead search, enrichment, and sequences',
    provider: 'apollo',
    Icon: Target,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Send and read emails from your Outlook',
    provider: 'outlook',
    Icon: Inbox,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
]

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
  const [composioStatus, setComposioStatus] = useState<{
    apollo: boolean
    outlook: boolean
  } | null>(null)

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const connections = useQuery(
    api.integrations.getIntegrationsByUserId,
    dbUser ? { userId: dbUser._id } : 'skip'
  )

  const refreshComposioStatus = useCallback(() => {
    fetch(API_ROUTES.composioStatus)
      .then((r) => r.json())
      .then((data) => setComposioStatus(data))
      .catch(() => setComposioStatus({ apollo: false, outlook: false }))
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

  const connectedProviders = new Set(
    (connections ?? [])
      .filter((c) => c.status === 'active')
      .map((c) => c.provider)
  )

  const telegramConnected = !!dbUser?.telegramId
  const composioConnected =
    (composioStatus?.apollo ? 1 : 0) + (composioStatus?.outlook ? 1 : 0)
  const connectedCount =
    connectedProviders.size + (telegramConnected ? 1 : 0) + composioConnected

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-8">
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white text-wrap-balance">
          Integrations
        </h1>
        <p className="mt-1 text-[15px] text-gray-400">
          Connect your accounts to power your AI assistant.{' '}
          <span className="tabular-nums text-gray-500">
            {connectedCount} of {INTEGRATIONS.length + COMPOSIO_INTEGRATIONS.length + 1} connected
          </span>
        </p>
      </div>

      <section
        aria-label="Available integrations"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {INTEGRATIONS.map(({ id, name, description, provider, Icon, iconBg, iconColor }) => {
          const isConnected = connectedProviders.has(provider)
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
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{description}</p>
                </div>
              </div>
              <div className="mt-4">
                {locked ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-xs text-gray-500">
                    <Lock className="h-3.5 w-3.5" />
                    Contact admin to request access
                  </span>
                ) : (
                  <ConnectButton
                    integrationId={id}
                    provider={provider}
                    isConnected={isConnected}
                  />
                )}
              </div>
            </div>
          )
        })}
        {COMPOSIO_INTEGRATIONS.map(
          ({ id, name, description, provider, Icon, iconBg, iconColor }) => {
            const isConnected =
              provider === 'apollo'
                ? composioStatus?.apollo
                : composioStatus?.outlook
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
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {description}
                    </p>
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
                      provider={provider}
                      isConnected={!!isConnected}
                      onSuccess={refreshComposioStatus}
                    />
                  )}
                </div>
              </div>
            )
          }
        )}
        <div
          key={TELEGRAM_ENTRY.id}
          className="flex flex-col rounded-xl border border-gray-800/60 bg-gray-900/40 p-5 transition-colors hover:border-gray-700/60"
        >
          <div className="flex min-w-0 items-start gap-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TELEGRAM_ENTRY.iconBg}`}
              aria-hidden="true"
            >
              <TELEGRAM_ENTRY.Icon className={`h-5 w-5 ${TELEGRAM_ENTRY.iconColor}`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{TELEGRAM_ENTRY.name}</p>
              <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{TELEGRAM_ENTRY.description}</p>
            </div>
          </div>
          <div className="mt-4">
            <TelegramConnectButton isConnected={telegramConnected} />
          </div>
        </div>
      </section>
    </div>
    </div>
  )
}
