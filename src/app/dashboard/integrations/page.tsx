'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ComposioConnectButton } from '@/components/ComposioConnectButton'
import { TelegramConnectButton } from '@/components/TelegramConnectButton'
import type { ComposioProvider } from '@/types'
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
  Database,
  CheckSquare,
  LayoutGrid,
  MessageCircle,
  Table,
  CreditCard,
  Calculator,
  Target,
  Inbox,
  Music2,
  LineChart,
  Radar,
} from 'lucide-react'
import { API_ROUTES } from '@/constants/api'
import { useCallback, useEffect, useState } from 'react'
import { COMPOSIO_PROVIDERS } from '@/lib/composioMappings'

const INTEGRATIONS: Array<{
  id: string
  name: string
  description: string
  provider: ComposioProvider
  Icon: React.ElementType
  iconBg: string
  iconColor: string
}> = [
  { id: 'gmail', name: 'Gmail', description: 'Read and send emails', provider: 'gmail', Icon: Mail, iconBg: 'bg-red-500/10', iconColor: 'text-red-400' },
  { id: 'google-calendar', name: 'Google Calendar', description: 'Access and manage calendar events', provider: 'google-calendar', Icon: Calendar, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
  { id: 'slack', name: 'Slack', description: 'Send and read messages', provider: 'slack', Icon: MessageSquare, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400' },
  { id: 'linkedin', name: 'LinkedIn', description: 'Manage your professional network', provider: 'linkedin', Icon: Linkedin, iconBg: 'bg-sky-500/10', iconColor: 'text-sky-400' },
  { id: 'instagram', name: 'Instagram', description: 'Schedule and publish content', provider: 'instagram', Icon: Camera, iconBg: 'bg-pink-500/10', iconColor: 'text-pink-400' },
  { id: 'tiktok', name: 'TikTok', description: 'Upload and publish short-form video', provider: 'tiktok', Icon: Music2, iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-400' },
  { id: 'metaAds', name: 'Meta Ads', description: 'Facebook and Instagram campaigns, creatives, and insights', provider: 'metaAds', Icon: LineChart, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
  { id: 'searchApi', name: 'Search API', description: 'Competitive ad libraries (Meta, LinkedIn, TikTok, Google) via SerpApi', provider: 'searchApi', Icon: Radar, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-400' },
  { id: 'notion', name: 'Notion', description: 'Read and write pages', provider: 'notion', Icon: FileText, iconBg: 'bg-gray-500/10', iconColor: 'text-gray-300' },
  { id: 'hubspot', name: 'HubSpot', description: 'Manage contacts and CRM data', provider: 'hubspot', Icon: BarChart2, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-400' },
  { id: 'salesforce', name: 'Salesforce', description: 'CRM, opportunities, and accounts', provider: 'salesforce', Icon: Building2, iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-400' },
  { id: 'zoho-crm', name: 'Zoho CRM', description: 'Leads, contacts, and deals', provider: 'zoho-crm', Icon: Database, iconBg: 'bg-red-500/10', iconColor: 'text-red-400' },
  { id: 'asana', name: 'Asana', description: 'Tasks, projects, and sections', provider: 'asana', Icon: CheckSquare, iconBg: 'bg-fuchsia-500/10', iconColor: 'text-fuchsia-400' },
  { id: 'monday', name: 'Monday.com', description: 'Boards, items, and updates', provider: 'monday', Icon: LayoutGrid, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-400' },
  { id: 'microsoft-teams', name: 'Microsoft Teams', description: 'Messages, channels, and teams', provider: 'microsoft-teams', Icon: MessageCircle, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-400' },
  { id: 'discord', name: 'Discord', description: 'Messages, channels, and members', provider: 'discord', Icon: MessageCircle, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-400' },
  { id: 'google-docs', name: 'Google Docs', description: 'Search, read, and create documents', provider: 'google-docs', Icon: FileText, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
  { id: 'google-sheet', name: 'Google Sheets', description: 'Read, write, and create spreadsheets', provider: 'google-sheet', Icon: Table, iconBg: 'bg-green-500/10', iconColor: 'text-green-400' },
  { id: 'airtable', name: 'Airtable', description: 'List bases and create records', provider: 'airtable', Icon: Table, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400' },
  { id: 'calendly', name: 'Calendly', description: 'Event types and scheduled events', provider: 'calendly', Icon: Calendar, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
  { id: 'stripe', name: 'Stripe', description: 'Customers, charges, and invoices', provider: 'stripe', Icon: CreditCard, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-400' },
  { id: 'quickbooks', name: 'QuickBooks', description: 'Invoices, customers, and payments', provider: 'quickbooks', Icon: Calculator, iconBg: 'bg-green-500/10', iconColor: 'text-green-400' },
  { id: 'mailchimp', name: 'Mailchimp', description: 'Audiences and campaigns', provider: 'mailchimp', Icon: Mail, iconBg: 'bg-yellow-500/10', iconColor: 'text-yellow-400' },
  { id: 'apollo', name: 'Apollo', description: 'Lead search, enrichment, and sequences', provider: 'apollo', Icon: Target, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-400' },
  { id: 'outlook', name: 'Outlook', description: 'Send and read emails from Outlook', provider: 'outlook', Icon: Inbox, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
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
              {connectedCount} of {INTEGRATIONS.length + 1} connected
            </span>
          </p>
        </div>

        <section
          aria-label="Available integrations"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {INTEGRATIONS.map(({ id, name, description, provider, Icon, iconBg, iconColor }) => {
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
                      provider={provider}
                      isConnected={isConnected}
                      onSuccess={refreshComposioStatus}
                    />
                  )}
                </div>
              </div>
            )
          })}
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
        </section>
      </div>
    </div>
  )
}
