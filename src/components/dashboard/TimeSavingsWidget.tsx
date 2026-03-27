'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Clock, HelpCircle, Settings2 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  DEFAULT_TIME_SAVINGS_METRIC_IDS,
  TIME_SAVINGS_METRIC_IDS,
  TIME_SAVINGS_METRIC_LABELS,
  type TimeSavingsMetricId,
} from '@/constants/dashboard'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const chartConfig = {
  research: {
    label: 'Research (est. h)',
    color: 'oklch(0.7 0.15 160)',
  },
  communication: {
    label: 'Messaging (est. h)',
    color: 'oklch(0.65 0.18 280)',
  },
} satisfies ChartConfig

function rangeTimestamps(rangeDays: 7 | 30) {
  const endTs = Date.now()
  const start = new Date(endTs)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (rangeDays - 1))
  return { startTs: start.getTime(), endTs }
}

function formatHours(h: number): string {
  if (!Number.isFinite(h)) return '—'
  if (h < 0.05 && h > 0) return '<0.1'
  return h.toFixed(1)
}

function isMetricEnabled(
  prefs: string[] | undefined,
  id: TimeSavingsMetricId
): boolean {
  if (!prefs || prefs.length === 0) return true
  return prefs.includes(id)
}

export interface TimeSavingsWidgetProps {
  tenantId: Id<'tenants'>
  userId: Id<'users'>
  enabledWidgets: string[]
  enabledMetricIds: string[] | undefined
}

export function TimeSavingsWidget({
  tenantId,
  userId,
  enabledWidgets,
  enabledMetricIds,
}: TimeSavingsWidgetProps) {
  const [rangeDays, setRangeDays] = useState<7 | 30>(7)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const { startTs, endTs } = useMemo(
    () => rangeTimestamps(rangeDays),
    [rangeDays]
  )

  const summary = useQuery(api.timeSavings.getSummary, {
    tenantId,
    startTs,
    endTs,
  })
  const daily = useQuery(api.timeSavings.getDailySeries, {
    tenantId,
    startTs,
    endTs,
  })

  const updatePreferences = useMutation(api.userDashboardPreferences.updatePreferences)

  const metricOn = (id: TimeSavingsMetricId) =>
    isMetricEnabled(enabledMetricIds, id)

  const chartData = useMemo(() => {
    if (!daily?.series) return []
    return daily.series.map((row) => ({
      date: row.date,
      research: Number(row.researchHours.toFixed(3)),
      communication: Number(row.communicationHours.toFixed(3)),
    }))
  }, [daily])

  const toggleMetric = (id: TimeSavingsMetricId) => {
    const currentIds =
      enabledMetricIds && enabledMetricIds.length > 0
        ? [...enabledMetricIds]
        : [...DEFAULT_TIME_SAVINGS_METRIC_IDS]
    const next = currentIds.includes(id)
      ? currentIds.filter((x) => x !== id)
      : [...currentIds, id]
    if (next.length === 0) return
    void updatePreferences({
      userId,
      enabledWidgets,
      enabledMetricIds: next,
    })
  }

  const showChart =
    metricOn(TIME_SAVINGS_METRIC_IDS.CHART) && chartData.length > 0

  return (
    <section
      aria-labelledby="time-savings-heading"
      className="rounded-xl border border-white/15 bg-card/50 backdrop-blur-xl"
    >
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Clock className="h-4 w-4 text-emerald-400" aria-hidden />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h2
                id="time-savings-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Time savings
              </h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="rounded text-muted-foreground hover:text-foreground"
                      aria-label="How we estimate time savings"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs" side="bottom">
                    Counts from your usage (research runs, ads intelligence,
                    outreach sends, inbox replies) multiplied by per-action
                    minutes. Defaults follow your niche; admins can tune
                    assumptions in org config.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated hours from activity in the last {rangeDays} days (UTC).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-background/50 p-0.5">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRangeDays(d)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  rangeDays === d
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          <Popover open={customizeOpen} onOpenChange={setCustomizeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Customize time savings metrics"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                Show rows
              </p>
              {DEFAULT_TIME_SAVINGS_METRIC_IDS.map((id) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={metricOn(id)}
                    onChange={() => toggleMetric(id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">
                    {TIME_SAVINGS_METRIC_LABELS[id]}
                  </span>
                </label>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-6 p-5 lg:p-8">
        {!summary ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div
              className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.12] via-card/60 to-transparent px-6 py-6 sm:px-8 sm:py-7"
              aria-live="polite"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/95">
                Estimated time saved (total)
              </p>
              <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {formatHours(summary.hours.totalEstimated)}
                <span className="ml-1.5 text-2xl font-medium text-muted-foreground sm:text-3xl lg:text-4xl">
                  h
                </span>
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Research, unified messaging, and personalization — tuned to your
                org&rsquo;s assumptions.{' '}
                {showChart
                  ? 'The breakdown and daily trend below show what drove this estimate.'
                  : 'The breakdown below shows what drove this estimate.'}
              </p>
            </div>

            <div
              className={cn(
                'grid gap-6 lg:gap-8',
                showChart ? 'lg:grid-cols-2 lg:items-start' : ''
              )}
            >
              <div className="min-w-0 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Breakdown
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
              {metricOn(TIME_SAVINGS_METRIC_IDS.RESEARCH) &&
                (summary.flags.hasProspect || summary.flags.hasAds) && (
                  <div className={STAT_CARD}>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      Research (est.)
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                      {formatHours(summary.hours.researchTotal)} h
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {summary.flags.hasProspect &&
                        `${summary.counts.prospectResearch} prospect snapshot(s)`}
                      {summary.flags.hasProspect &&
                        summary.flags.hasAds &&
                        ' · '}
                      {summary.flags.hasAds &&
                        `${summary.counts.adsCompleted} ads run(s)`}
                    </p>
                  </div>
                )}

              {metricOn(TIME_SAVINGS_METRIC_IDS.OUTREACH) &&
                summary.flags.hasOutreach && (
                  <div className={STAT_CARD}>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      Outreach from platform
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                      {formatHours(summary.hours.outreach)} h
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {summary.counts.outreachSent} send(s) ·{' '}
                      {summary.assumptions.minutesPerOutreachSend} min each
                    </p>
                  </div>
                )}

              {metricOn(TIME_SAVINGS_METRIC_IDS.INBOX) &&
                summary.flags.hasInbox && (
                  <div className={STAT_CARD}>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      Unified inbox replies
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                      {formatHours(summary.hours.inbox)} h
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {summary.counts.inboxOutbound} reply(ies) ·{' '}
                      {summary.assumptions.minutesPerInboxReply} min each
                    </p>
                  </div>
                )}

              {metricOn(TIME_SAVINGS_METRIC_IDS.PERSONALIZATION) &&
                summary.flags.hasOutreach &&
                summary.flags.hasProspect && (
                  <div className={STAT_CARD}>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      Personalization (est.)
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                      {formatHours(summary.hours.personalization)} h
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {summary.counts.personalizedSends} send(s) after research ·{' '}
                      {summary.assumptions.minutesPerPersonalizedOutreach} min
                      each
                    </p>
                  </div>
                )}

              {metricOn(TIME_SAVINGS_METRIC_IDS.VELOCITY) &&
                summary.flags.hasProspect && (
                  <div className={cn(STAT_CARD, 'sm:col-span-2')}>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      Avg. days to meeting booked
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                      {summary.velocityAvgDaysToMeetingBooked !== null
                        ? summary.velocityAvgDaysToMeetingBooked.toFixed(1)
                        : '—'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {summary.counts.meetingBookedInPeriod} prospect(s) moved to
                      meeting booked in this window
                    </p>
                  </div>
                )}
                </div>
              </div>

              {showChart && (
                <div className="min-w-0 rounded-xl border border-white/10 bg-background/25 p-4 sm:p-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Daily trend
                  </p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Stacked estimated hours: research vs messaging (per UTC day).
                  </p>
                  <ChartContainer
                    config={chartConfig}
                    className="aspect-auto min-h-[260px] w-full lg:min-h-[300px]"
                  >
                    <AreaChart data={chartData} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        tickMargin={8}
                        axisLine={false}
                        tickFormatter={(v) =>
                          typeof v === 'string' && v.length >= 10
                            ? v.slice(5, 10)
                            : String(v)
                        }
                      />
                      <YAxis tickLine={false} axisLine={false} width={44} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area
                        dataKey="research"
                        type="monotone"
                        fill="var(--color-research)"
                        fillOpacity={0.3}
                        stroke="var(--color-research)"
                        strokeWidth={2}
                        stackId="a"
                      />
                      <Area
                        dataKey="communication"
                        type="monotone"
                        fill="var(--color-communication)"
                        fillOpacity={0.3}
                        stroke="var(--color-communication)"
                        strokeWidth={2}
                        stackId="a"
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

const STAT_CARD =
  'rounded-lg border border-white/10 bg-background/30 px-4 py-3'
