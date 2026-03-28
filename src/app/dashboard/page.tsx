'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import {
  Plug,
  Zap,
  MessageSquare,
  ArrowRight,
  Coins,
  GitBranch,
  Calendar,
  Settings2,
  Check,
  Circle,
  Plus,
  Trash2,
  DollarSign,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import {
  DASHBOARD_WIDGETS,
  DEFAULT_ENABLED_WIDGETS,
  type DashboardWidgetId,
} from '@/constants/dashboard'
import { TimeSavingsWidget } from '@/components/dashboard/TimeSavingsWidget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const STAT_CARD_BASE = {
  iconRow: 'flex items-center justify-between',
  cardBase:
    'group flex flex-col gap-4 rounded-xl border border-white/15 bg-card/50 backdrop-blur-xl p-5 transition-colors hover:border-white/25 hover:bg-card/60 min-h-[140px]',
} as const

const STAT_CARDS = [
  {
    href: '/dashboard/integrations' as const,
    label: 'Connected Integrations',
    icon: Plug,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    href: '/dashboard/skills' as const,
    label: 'Active Skills',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    href: '/dashboard/chat' as const,
    label: 'Messages Today',
    icon: MessageSquare,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    href: '/dashboard/schedules' as const,
    label: 'Active Schedules',
    icon: Calendar,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    href: '/dashboard/workflows' as const,
    label: 'Workflow Runs',
    icon: GitBranch,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    href: null,
    label: 'Credits Remaining',
    icon: Coins,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
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
      <a
        href="mailto:support@example.com"
        className="shrink-0 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-200"
      >
        Contact us
      </a>
    </div>
  )
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const { config } = useOrgConfig()
  const [todoInput, setTodoInput] = useState('')
  const [customizeOpen, setCustomizeOpen] = useState(false)

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

  const schedules = useQuery(
    api.schedules.listByTenantId,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const workflowRuns = useQuery(
    api.workflowRuns.listByTenantId,
    dbUser ? { tenantId: dbUser.tenantId, limit: 5 } : 'skip'
  )

  const creditBalance = useQuery(
    api.credits.getCreditBalance,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const trialStatus = useQuery(
    api.billing.getTrialStatus,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const dailyTodos = useQuery(
    api.dailyTodos.getByUserAndDate,
    dbUser
      ? { userId: dbUser._id, date: getTodayDateString() }
      : 'skip'
  )

  const widgetPrefs = useQuery(
    api.userDashboardPreferences.getByUserId,
    dbUser ? { userId: dbUser._id } : 'skip'
  )

  const addTodo = useMutation(api.dailyTodos.addItem)
  const toggleTodo = useMutation(api.dailyTodos.toggleItem)
  const removeTodo = useMutation(api.dailyTodos.removeItem)
  const updateWidgetPrefs = useMutation(
    api.userDashboardPreferences.updatePreferences
  )

  const integrationsCount =
    integrations?.filter((i) => i.status === 'active').length ?? 0
  const skillsCount = skills?.filter((s) => s.isEnabled).length ?? 0
  const activeSchedulesCount =
    schedules?.filter((s) => s.isEnabled).length ?? 0
  const nextScheduleRun = schedules
    ?.filter((s) => s.isEnabled && s.nextRunAt)
    .sort((a, b) => (a.nextRunAt ?? 0) - (b.nextRunAt ?? 0))[0]
  const workflowRunsCount = workflowRuns?.length ?? 0

  const availableWidgets = useMemo((): DashboardWidgetId[] => {
    const base = [...DEFAULT_ENABLED_WIDGETS]
    const withoutWorkflow = !config.features.workflowBuilder
      ? base.filter((w) => w !== DASHBOARD_WIDGETS.WORKFLOW_RUNS)
      : base
    return withoutWorkflow
  }, [config.features.workflowBuilder])

  const enabledWidgets = useMemo((): DashboardWidgetId[] => {
    const fromPrefs = widgetPrefs?.enabledWidgets as
      | DashboardWidgetId[]
      | undefined
    if (fromPrefs && fromPrefs.length > 0) {
      return fromPrefs.filter((w) =>
        config.features.workflowBuilder
          ? true
          : w !== DASHBOARD_WIDGETS.WORKFLOW_RUNS
      )
    }
    return availableWidgets
  }, [widgetPrefs, config.features.workflowBuilder, availableWidgets])

  /** Time savings first when enabled so the overview leads with estimated impact. */
  const orderedWidgets = useMemo((): DashboardWidgetId[] => {
    const ts = DASHBOARD_WIDGETS.TIME_SAVINGS
    if (!enabledWidgets.includes(ts)) return enabledWidgets
    return [ts, ...enabledWidgets.filter((w) => w !== ts)]
  }, [enabledWidgets])

  const toggleWidget = (widgetId: DashboardWidgetId) => {
    if (!dbUser) return
    const next = enabledWidgets.includes(widgetId)
      ? enabledWidgets.filter((w) => w !== widgetId)
      : [...enabledWidgets, widgetId]
    updateWidgetPrefs({
      userId: dbUser._id,
      enabledWidgets: next,
    })
  }

  const visibleStatCards = STAT_CARDS.filter((card) => {
    if (card.href === '/dashboard/schedules' && !config.features.scheduledTasks)
      return false
    if (card.href === '/dashboard/workflows' && !config.features.workflowBuilder)
      return false
    return true
  })

  const allStatValues = [
    !isLoaded || integrations === undefined ? null : integrationsCount,
    !isLoaded || skills === undefined ? null : skillsCount,
    !isLoaded || messagesToday === undefined ? null : messagesToday,
    !isLoaded || schedules === undefined ? null : activeSchedulesCount,
    !isLoaded || workflowRuns === undefined ? null : workflowRunsCount,
    !isLoaded || creditBalance === undefined ? null : creditBalance,
  ]
  const statValues = visibleStatCards.map((card) => {
    const idx = STAT_CARDS.findIndex((c) => c.label === card.label)
    return idx >= 0 ? allStatValues[idx] : null
  })

  const todoItems = useMemo(
    () =>
      (dailyTodos?.items ?? []).sort((a, b) => a.order - b.order),
    [dailyTodos?.items]
  )

  const handleAddTodo = async () => {
    const text = todoInput.trim()
    if (!text || !dbUser) return
    setTodoInput('')
    await addTodo({
      userId: dbUser._id,
      date: getTodayDateString(),
      text,
    })
  }

  const handleToggleTodo = (itemId: string) => {
    if (!dbUser) return
    toggleTodo({
      userId: dbUser._id,
      date: getTodayDateString(),
      itemId,
    })
  }

  const handleRemoveTodo = (itemId: string) => {
    if (!dbUser) return
    removeTodo({
      userId: dbUser._id,
      date: getTodayDateString(),
      itemId,
    })
  }

  const firstName = user?.firstName ?? 'there'
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground text-wrap-balance">
              Good morning, {firstName}
            </h1>
            <p className="mt-1 text-[15px] text-muted-foreground">
              Here&rsquo;s what&rsquo;s happening with your AI OS today.
            </p>
          </div>
          <Popover open={customizeOpen} onOpenChange={setCustomizeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Customize dashboard"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                Show widgets
              </p>
              {[
                DASHBOARD_WIDGETS.TODO_CHECKLIST,
                DASHBOARD_WIDGETS.STATS,
                DASHBOARD_WIDGETS.FINANCIAL_SUMMARY,
                DASHBOARD_WIDGETS.TIME_SAVINGS,
                ...(config.features.workflowBuilder
                  ? [DASHBOARD_WIDGETS.WORKFLOW_RUNS]
                  : []),
              ].map((id) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={enabledWidgets.includes(id)}
                    onChange={() => toggleWidget(id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">
                    {id === DASHBOARD_WIDGETS.TODO_CHECKLIST && "Today's checklist"}
                    {id === DASHBOARD_WIDGETS.STATS && 'Quick stats'}
                    {id === DASHBOARD_WIDGETS.FINANCIAL_SUMMARY &&
                      'Financial summary'}
                    {id === DASHBOARD_WIDGETS.WORKFLOW_RUNS &&
                      'Recent workflow runs'}
                    {id === DASHBOARD_WIDGETS.TIME_SAVINGS && 'Time savings'}
                  </span>
                </label>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {trialStatus?.isOnTrial && trialStatus.daysRemaining > 0 && (
          <TrialBanner daysRemaining={trialStatus.daysRemaining} />
        )}

        {orderedWidgets.map((widgetId) => {
          if (widgetId === DASHBOARD_WIDGETS.TODO_CHECKLIST) {
            return (
              <section
                key={widgetId}
                aria-labelledby="todo-heading"
                className="rounded-xl border border-white/15 bg-card/50 backdrop-blur-xl"
              >
                <div className="border-b border-white/10 px-5 py-4">
                  <h2
                    id="todo-heading"
                    className="text-[15px] font-medium text-foreground"
                  >
                    Today&rsquo;s checklist
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {todayLabel}
                  </p>
                </div>
                <div className="p-4">
                  <ul className="space-y-2">
                    {todoItems.map((item) => (
                      <li
                        key={item.id}
                        className="group flex items-center gap-3 rounded-lg py-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTodo(item.id)}
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {item.completed ? (
                            <Check className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                        <span
                          className={`flex-1 text-sm ${
                            item.completed
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          }`}
                        >
                          {item.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTodo(item.id)}
                          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddTodo()
                    }}
                    className="mt-3 flex gap-2"
                  >
                    <Input
                      type="text"
                      placeholder="Add an item…"
                      value={todoInput}
                      onChange={(e) => setTodoInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTodo()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={!todoInput.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </section>
            )
          }

          if (widgetId === DASHBOARD_WIDGETS.STATS) {
            return (
              <section
                key={widgetId}
                aria-labelledby="stats-heading"
                className="rounded-xl border border-white/15 bg-card/50 backdrop-blur-xl"
              >
                <div className="border-b border-white/10 px-5 py-4">
                  <h2
                    id="stats-heading"
                    className="text-[15px] font-medium text-foreground"
                  >
                    Quick stats
                  </h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 grid-flow-dense">
                    {visibleStatCards.map(
                      ({ href, label, icon: Icon, color, bg }, i) => {
                        const value = statValues[i]
                        const card = (
                          <div
                            className={`${STAT_CARD_BASE.cardBase} flex-1`}
                            key={label}
                          >
                            <div className={STAT_CARD_BASE.iconRow}>
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}
                              >
                                <Icon
                                  className={`h-4 w-4 ${color}`}
                                  aria-hidden="true"
                                />
                              </span>
                              <span className="h-4 w-4 shrink-0">
                                {href ? (
                                  <ArrowRight
                                    className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <span
                                    className="inline-block w-4"
                                    aria-hidden="true"
                                  />
                                )}
                              </span>
                            </div>
                            <div className="min-h-0 flex-1">
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
                                  <span
                                    className="text-muted-foreground"
                                    aria-label="Loading…"
                                  >
                                    …
                                  </span>
                                ) : (
                                  value
                                )}
                              </p>
                            </div>
                          </div>
                        )

                        return href ? (
                          <Link
                            href={href}
                            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl block"
                            aria-label={`${label}: ${value ?? 'loading'}`}
                            key={label}
                          >
                            {card}
                          </Link>
                        ) : (
                          <div key={label}>{card}</div>
                        )
                      }
                    )}
                  </div>
                </div>
              </section>
            )
          }

          if (widgetId === DASHBOARD_WIDGETS.TIME_SAVINGS && dbUser) {
            return (
              <TimeSavingsWidget
                key={widgetId}
                tenantId={dbUser.tenantId}
                userId={dbUser._id}
                enabledWidgets={enabledWidgets}
                enabledMetricIds={widgetPrefs?.enabledMetricIds}
              />
            )
          }

          if (widgetId === DASHBOARD_WIDGETS.FINANCIAL_SUMMARY) {
            return (
              <section
                key={widgetId}
                aria-labelledby="financial-heading"
                className="rounded-xl border border-white/15 bg-card/50 backdrop-blur-xl"
              >
                <div className="flex items-start gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <DollarSign
                      className="h-5 w-5 text-emerald-400"
                      aria-hidden="true"
                    />
                  </span>
                  <div>
                    <h2
                      id="financial-heading"
                      className="text-[15px] font-medium text-foreground"
                    >
                      Financial summary
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Connect your Stripe account to see revenue, MRR, and more.
                      Coming soon.
                    </p>
                  </div>
                </div>
              </section>
            )
          }

          if (
            widgetId === DASHBOARD_WIDGETS.WORKFLOW_RUNS &&
            config.features.workflowBuilder
          ) {
            return (
              <section
                key={widgetId}
                aria-labelledby="activity-heading"
                className="rounded-xl border border-white/15 bg-card/50 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <h2
                    id="activity-heading"
                    className="text-[15px] font-medium text-foreground"
                  >
                    Recent Workflow Runs
                  </h2>
                  <Link
                    href="/dashboard/workflows"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    View all
                  </Link>
                </div>
                {workflowRuns && workflowRuns.length > 0 ? (
                  <ul className="divide-y divide-white/10">
                    {workflowRuns.map((run) => (
                      <li key={run._id}>
                        <Link
                          href="/dashboard/workflows"
                          className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                        >
                          <span className="text-sm truncate">
                            Run {run._id.slice(-8)}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              run.status === 'success'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : run.status === 'failed'
                                  ? 'bg-red-500/20 text-red-400'
                                  : run.status === 'suspended'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {run.status}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                      <GitBranch
                        className="h-5 w-5 text-gray-600"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      No workflow runs yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Run a workflow from the Workflows page to see activity
                      here.
                    </p>
                  </div>
                )}
              </section>
            )
          }

          return null
        })}

        {config.features.scheduledTasks && nextScheduleRun && (
          <section aria-labelledby="next-schedule-heading">
            <div className="rounded-xl border border-white/15 bg-card/50 backdrop-blur-xl px-5 py-4">
              <h2
                id="next-schedule-heading"
                className="text-[15px] font-medium text-foreground mb-2"
              >
                Next scheduled run
              </h2>
              <p className="text-sm text-muted-foreground">
                <strong>{nextScheduleRun.name}</strong> —{' '}
                {new Date(nextScheduleRun.nextRunAt!).toLocaleString()}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
