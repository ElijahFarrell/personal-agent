'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import Link from 'next/link'
import { Plug, Zap, MessageSquare, Clock, ArrowRight, Coins } from 'lucide-react'
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

function TrialBanner({ daysRemaining }: { daysRemaining: number }) {
  const urgency = daysRemaining <= 2

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-5 py-4 backdrop-blur-md ${
        urgency
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-brand-500/30 bg-brand-500/10'
      }`}
      role="status"
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            urgency ? 'bg-amber-500/20' : 'bg-brand-500/20'
          }`}
        >
          <Coins
            className={`h-4 w-4 ${urgency ? 'text-amber-400' : 'text-brand-400'}`}
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {daysRemaining === 1
              ? 'Last day of your free trial'
              : `${daysRemaining} days left in your free trial`}
          </p>
          <p className="text-xs text-muted-foreground">
            {urgency
              ? 'Upgrade now to keep all Pro features.'
              : 'Enjoying Pro features? Upgrade anytime to keep access.'}
          </p>
        </div>
      </div>
      <button className="shrink-0 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-200">
        Upgrade
      </button>
    </div>
  )
}

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

  const creditBalance = useQuery(
    api.credits.getCreditBalance,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const trialStatus = useQuery(
    api.billing.getTrialStatus,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-wrap-balance">
          Good morning, {firstName}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Here&rsquo;s what&rsquo;s happening with your AI OS today.
        </p>
      </div>

      {trialStatus?.isOnTrial && trialStatus.daysRemaining > 0 && (
        <TrialBanner daysRemaining={trialStatus.daysRemaining} />
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        {STAT_CARDS.map(({ href, label, icon: Icon, color, bg }, i) => {
          const value = statValues[i]
          const card = (
            <div className="group flex flex-col gap-4 rounded-xl border border-white/15 bg-card/50 backdrop-blur-xl p-5 transition-colors hover:border-white/25 hover:bg-card/60">
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
                </span>
                {href && (
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div>
                <p
                  className="text-[13px] font-medium text-muted-foreground"
                  id={`stat-label-${i}`}
                >
                  {label}
                </p>
                <p
                  className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground"
                  aria-labelledby={`stat-label-${i}`}
                >
                  {value === null ? (
                    <span className="text-muted-foreground" aria-label="Loading…">…</span>
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

        <div className="group flex flex-col gap-4 rounded-xl border border-white/10 bg-card/80 backdrop-blur-md p-5 transition-colors hover:border-white/20 hover:bg-card/90">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <Coins className="h-4 w-4 text-violet-400" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-400" id="stat-label-credits">
              Credits Remaining
            </p>
            <p
              className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-white"
              aria-labelledby="stat-label-credits"
            >
              {creditBalance === undefined ? (
                <span className="text-muted-foreground" aria-label="Loading…">…</span>
              ) : (
                creditBalance
              )}
            </p>
          </div>
        </div>
      </div>

      <section aria-labelledby="activity-heading">
        <div className="rounded-xl border border-white/15 bg-card/50 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2
              id="activity-heading"
              className="text-[15px] font-medium text-foreground"
            >
              Recent Activity
            </h2>
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
              <Clock className="h-5 w-5 text-gray-600" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground">
              Activity from your integrations and skills will appear here.
            </p>
          </div>
        </div>
      </section>
    </div>
    </div>
  )
}
