'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import Link from 'next/link'
import { Plug, Zap, MessageSquare, Clock, ArrowRight } from 'lucide-react'
import { api } from '@convex/_generated/api'

const STAT_CARDS = [
  {
    href: '/dashboard/integrations',
    label: 'Connected Integrations',
    icon: Plug,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    href: '/dashboard/skills',
    label: 'Active Skills',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    href: '/dashboard/chat',
    label: 'Messages Today',
    icon: MessageSquare,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
] as const

export default function DashboardPage() {
  const { user, isLoaded } = useUser()

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const integrations = useQuery(
    api.integrations.getIntegrationsByUserId,
    dbUser ? { userId: dbUser._id } : 'skip'
  )

  const skills = useQuery(
    api.skills.getAllSkillsForChat,
    dbUser ? { tenantId: dbUser.tenantId, userId: dbUser._id } : 'skip'
  )

  const messagesToday = useQuery(
    api.messages.getMessageCountToday,
    dbUser ? { userId: dbUser._id } : 'skip'
  )

  const integrationsCount =
    integrations?.filter((i) => i.status === 'active').length ?? 0
  const skillsCount = skills?.filter((s) => s.isEnabled).length ?? 0

  const statValues = [
    !isLoaded || integrations === undefined ? null : integrationsCount,
    !isLoaded || skills === undefined ? null : skillsCount,
    !isLoaded || messagesToday === undefined ? null : messagesToday,
  ]

  const firstName = user?.firstName ?? 'there'

  return (
    <div className="flex-1 overflow-y-auto p-8">
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white text-wrap-balance">
          Good morning, {firstName}
        </h1>
        <p className="mt-1 text-[15px] text-gray-400">
          Here&rsquo;s what&rsquo;s happening with your AI OS today.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {STAT_CARDS.map(({ href, label, icon: Icon, color, bg }, i) => {
          const value = statValues[i]
          const card = (
            <div className="group flex flex-col gap-4 rounded-xl border border-gray-800/80 bg-gray-900/50 p-5 transition-colors hover:border-gray-700 hover:bg-gray-900/80">
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
                </span>
                {href && (
                  <ArrowRight
                    className="h-4 w-4 text-gray-600 transition-colors group-hover:text-gray-400"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div>
                <p
                  className="text-[13px] font-medium text-gray-400"
                  id={`stat-label-${i}`}
                >
                  {label}
                </p>
                <p
                  className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-white"
                  aria-labelledby={`stat-label-${i}`}
                >
                  {value === null ? (
                    <span className="text-gray-600" aria-label="Loading…">…</span>
                  ) : (
                    value
                  )}
                </p>
              </div>
            </div>
          )

          return href ? (
            <Link
              key={label}
              href={href}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl"
              aria-label={`${label}: ${value ?? 'loading'}`}
            >
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          )
        })}
      </div>

      <section aria-labelledby="activity-heading">
        <div className="rounded-xl border border-gray-800/80 bg-gray-900/50">
          <div className="flex items-center justify-between border-b border-gray-800/60 px-5 py-4">
            <h2
              id="activity-heading"
              className="text-[15px] font-medium text-white"
            >
              Recent Activity
            </h2>
            <Clock className="h-4 w-4 text-gray-600" aria-hidden="true" />
          </div>
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/60">
              <Clock className="h-5 w-5 text-gray-600" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-400">No activity yet</p>
            <p className="text-xs text-gray-600">
              Activity from your integrations and skills will appear here.
            </p>
          </div>
        </div>
      </section>
    </div>
    </div>
  )
}
