'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import type { Id } from '@convex/_generated/dataModel'
import { LineChart, Loader2, RefreshCw } from 'lucide-react'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ThreadSidebar } from '@/components/chat/ThreadSidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { API_ROUTES } from '@/constants/api'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isAgentAllowed, isIntegrationAllowed } from '@/constants/featureGating'
import type { AgentId } from '@/constants/agents'

const META_ADS_AGENT_ID = 'metaAds' as AgentId

interface InsightsPayload {
  accounts: Array<{ id: string; name?: string }>
  kpis: Array<{ label: string; value: string }>
  series: Array<{ name: string; spend: number; impressions: number; clicks: number }>
  rows: Array<Record<string, string | number | undefined>>
  selectedObjectId: string | null
  datePreset: string
}

export default function MetaAdsInsightsPage() {
  const { config } = useOrgConfig()
  const enabled = isAgentAllowed(config, 'metaAds')
  const integrationOk = isIntegrationAllowed(config, 'metaAds')

  const [activeThreadId, setActiveThreadId] = useState<Id<'threads'> | null>(null)
  const [rightTab, setRightTab] = useState<'chat' | 'history'>('chat')

  const [insights, setInsights] = useState<InsightsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | undefined>(undefined)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!enabled || !integrationOk) return
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError(null)
      const qs = new URLSearchParams()
      if (accountId) qs.set('objectId', accountId)
      qs.set('datePreset', 'last_7d')
      try {
        const res = await fetch(`${API_ROUTES.metaAdsInsights}?${qs.toString()}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Request failed')
        if (!cancelled) setInsights(data as InsightsPayload)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load insights')
          setInsights(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, integrationOk, accountId, refreshKey])

  const handleThreadCreated = useCallback((threadId: Id<'threads'>) => {
    setActiveThreadId(threadId)
  }, [])

  const maxSpend =
    insights?.series?.reduce((m, s) => Math.max(m, s.spend), 0) ?? 1

  if (!enabled) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Meta Ads</CardTitle>
            <CardDescription>
              Not enabled for your organization. Contact your admin to allow the Meta Ads agent.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <LineChart className="h-6 w-6 text-muted-foreground" />
              Meta Ads
            </h1>
            <p className="text-sm text-muted-foreground">
              Campaign performance (last 7 days). Connect Meta Ads under{' '}
              <Link href="/dashboard/integrations" className="text-brand-400 underline-offset-2 hover:underline">
                Integrations
              </Link>
              .
            </p>
          </div>

          {!integrationOk && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Integration locked</CardTitle>
                <CardDescription>
                  Your admin has not enabled the Meta Ads integration for this workspace.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || !integrationOk}
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            {insights && insights.accounts.length > 1 && (
              <Select
                value={accountId ?? insights.selectedObjectId ?? ''}
                onValueChange={(v) => setAccountId(v)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Ad account" />
                </SelectTrigger>
                <SelectContent>
                  {insights.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name ?? a.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {loading && !insights && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Loading insights…
            </div>
          )}

          {insights && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {insights.kpis.map((k) => (
                  <Card key={k.label}>
                    <CardHeader className="pb-2">
                      <CardDescription>{k.label}</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">{k.value}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Spend by campaign</CardTitle>
                  <CardDescription>Relative spend (last 7 days)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {insights.series.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No campaign data for this range.</p>
                  ) : (
                    insights.series.map((s) => (
                      <div key={s.name} className="flex items-center gap-3 text-sm">
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                          {s.name}
                        </span>
                        <div className="h-2 w-32 shrink-0 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{
                              width: `${Math.max(8, (s.spend / maxSpend) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                          {s.spend.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Campaigns</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Campaign</th>
                        <th className="py-2 pr-4 font-medium">Spend</th>
                        <th className="py-2 pr-4 font-medium">Impressions</th>
                        <th className="py-2 font-medium">Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-muted-foreground">
                            No rows
                          </td>
                        </tr>
                      ) : (
                        insights.rows.map((row, i) => (
                          <tr key={`${row.campaign_id ?? row.campaign}-${i}`} className="border-b border-border/60">
                            <td className="py-2 pr-4">{String(row.campaign ?? '')}</td>
                            <td className="py-2 pr-4 tabular-nums">{numFmt(row.spend)}</td>
                            <td className="py-2 pr-4 tabular-nums">{numFmt(row.impressions)}</td>
                            <td className="py-2 tabular-nums">{numFmt(row.clicks)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col border-t border-white/10 bg-sidebar/40 backdrop-blur-xl lg:w-[380px] lg:border-l lg:border-t-0">
        <Tabs
          value={rightTab}
          onValueChange={(v) => setRightTab(v as 'chat' | 'history')}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-4 mt-3 w-auto shrink-0 justify-start">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <div className="min-h-0 flex-1">
              <ChatWindow
                threadId={activeThreadId}
                onThreadCreated={handleThreadCreated}
                initialTargetAgent={META_ADS_AGENT_ID}
                lockTargetAgent
              />
            </div>
          </TabsContent>
          <TabsContent value="history" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              <ThreadSidebar
                activeThreadId={activeThreadId}
                onSelectThread={setActiveThreadId}
                onNewThread={() => setActiveThreadId(null)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  )
}

function numFmt(v: unknown): string {
  if (typeof v === 'number' && !Number.isNaN(v)) return v.toLocaleString()
  if (typeof v === 'string') return v
  return '—'
}
