'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ConnectButton } from '@/components/ConnectButton'
import type { IntegrationProvider } from '@/types'
import {
  Mail,
  Calendar,
  MessageSquare,
  Linkedin,
  Camera,
  FileText,
  BarChart2,
} from 'lucide-react'

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
]

export default function IntegrationsPage() {
  const { user } = useUser()

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const connections = useQuery(
    api.integrations.getIntegrationsByUserId,
    dbUser ? { userId: dbUser._id } : 'skip'
  )

  const connectedProviders = new Set(
    (connections ?? [])
      .filter((c) => c.status === 'active')
      .map((c) => c.provider)
  )

  const connectedCount = connectedProviders.size

  return (
    <div className="flex-1 overflow-y-auto p-8">
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white text-wrap-balance">
          Integrations
        </h1>
        <p className="mt-1 text-[15px] text-gray-400">
          Connect your accounts to power your AI assistant.{' '}
          <span className="tabular-nums text-gray-500">
            {connectedCount} of {INTEGRATIONS.length} connected
          </span>
        </p>
      </div>

      <section
        aria-label="Available integrations"
        className="rounded-xl border border-gray-800/80 bg-gray-900/50"
      >
        <ul
          className="divide-y divide-gray-800/60"
          role="list"
          aria-label="Integrations list"
        >
          {INTEGRATIONS.map(({ id, name, description, provider, Icon, iconBg, iconColor }) => {
            const isConnected = connectedProviders.has(provider)
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                    aria-hidden="true"
                  >
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{name}</p>
                    <p className="truncate text-xs text-gray-500">{description}</p>
                  </div>
                </div>
                <ConnectButton
                  integrationId={id}
                  provider={provider}
                  isConnected={isConnected}
                />
              </li>
            )
          })}
        </ul>
      </section>
    </div>
    </div>
  )
}
