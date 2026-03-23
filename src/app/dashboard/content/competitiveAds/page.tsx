'use client'

import { useCallback, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { AlertTriangle, Copy, Loader2, Radar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isAgentAllowed, isIntegrationAllowed } from '@/constants/featureGating'
import { API_ROUTES } from '@/constants/api'
import type { AdsPlatform } from '@/services/adsIntelligence/contracts'
import { ADS_PIPELINE_RUN_STATUS } from '@convex/constants'

const PLATFORM_OPTIONS: { id: AdsPlatform; label: string }[] = [
  { id: 'meta', label: 'Meta (Facebook / Instagram)' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'google', label: 'Google Ads Transparency' },
]

export default function CompetitiveAdsPage() {
  const { user } = useUser()
  const { config } = useOrgConfig()
  const allowed =
    isAgentAllowed(config, 'adsScraper') &&
    isIntegrationAllowed(config, 'searchApi')

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const runs = useQuery(
    api.adsPipelineRuns.listRunsForTenant,
    dbUser && allowed ? { tenantId: dbUser.tenantId, limit: 40 } : 'skip'
  )

  const [query, setQuery] = useState('')
  const [focusArea, setFocusArea] = useState('')
  const [businessProfile, setBusinessProfile] = useState('')
  const [platforms, setPlatforms] = useState<AdsPlatform[]>(['meta', 'linkedin'])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const togglePlatform = useCallback((p: AdsPlatform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }, [])

  const canSubmit = useMemo(
    () => query.trim().length > 0 && platforms.length > 0 && !loading,
    [query, platforms.length, loading]
  )

  async function runPipeline() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(API_ROUTES.adsIntelligenceRun, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          platforms,
          focusArea: focusArea.trim() || undefined,
          businessProfile: businessProfile.trim() || undefined,
        }),
      })
      const data = (await res.json()) as { error?: string; runId?: string }
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setMessage('Run completed. See results below.')
      if (data.runId) setExpandedId(data.runId)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function copyText(label: string, text: string | undefined) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setMessage(`Copied ${label}.`)
    } catch {
      setMessage('Copy failed.')
    }
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Competitive Ads</CardTitle>
            <CardDescription>
              Not enabled for your organization. Ask an admin to allow the Search API integration and
              ads intelligence agents.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Radar className="h-7 w-7 text-muted-foreground" />
          Competitive Ads
        </h1>
        <p className="text-muted-foreground">
          Multi-platform ad library research, analysis, and campaign briefs. Uses{' '}
          <strong>Search API</strong> only (connect under Integrations).{' '}
          <strong>Meta Ads</strong> under Content & Ads is for live account execution — separate from this
          flow.
        </p>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Long-running workflow
          </CardTitle>
          <CardDescription className="text-amber-100/90">
            This pipeline can take <strong>5+ minutes</strong>, especially with multiple platforms. Keep
            this tab open until it finishes. Stage progress updates: Scraping → Analyzing → Building.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New run</CardTitle>
          <CardDescription>
            We run parallel searches per ad-library engine, then analyze cached results and draft a campaign
            brief.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ads-q">Research query</Label>
            <Input
              id="ads-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. competitor brand name + product category"
            />
          </div>
          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLATFORM_OPTIONS.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-border"
                    checked={platforms.includes(p.id)}
                    onChange={() => togglePlatform(p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ads-focus">Focus (optional)</Label>
            <Input
              id="ads-focus"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="e.g. video creatives, discount messaging"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ads-biz">Business profile (optional)</Label>
            <Input
              id="ads-biz"
              value={businessProfile}
              onChange={(e) => setBusinessProfile(e.target.value)}
              placeholder="One-liner on your offer and ICP for the campaign brief"
            />
          </div>
          <Button type="button" onClick={() => void runPipeline()} disabled={!canSubmit}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Radar className="mr-2 h-4 w-4" />
            )}
            Run pipeline
          </Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent runs</h2>
        {!runs && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {runs && runs.length === 0 && (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        )}
        {runs && runs.length > 0 && (
          <ul className="space-y-3">
            {runs.map((r) => {
              const open = expandedId === r._id
              return (
                <li key={r._id} className="rounded-lg border border-border">
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left text-sm"
                    onClick={() => setExpandedId(open ? null : r._id)}
                  >
                    <span className="font-medium line-clamp-2">{r.query}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.status} · {r.currentStage ?? '—'} ·{' '}
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </button>
                  {open && (
                    <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Platforms: {r.platforms.join(', ')}</span>
                        <span>Engines: {r.requestedEngines.join(', ')}</span>
                      </div>
                      {r.error && (
                        <p className="rounded-md bg-destructive/10 px-2 py-1 text-destructive">
                          {r.error}
                        </p>
                      )}
                      {r.analysisMarkdown && (
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-medium">Analysis</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1"
                              onClick={() => void copyText('analysis', r.analysisMarkdown)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </Button>
                          </div>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
                            {r.analysisMarkdown}
                          </pre>
                        </div>
                      )}
                      {r.campaignBriefMarkdown && (
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-medium">Campaign brief</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1"
                              onClick={() => void copyText('brief', r.campaignBriefMarkdown)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </Button>
                          </div>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
                            {r.campaignBriefMarkdown}
                          </pre>
                        </div>
                      )}
                      {r.status === ADS_PIPELINE_RUN_STATUS.COMPLETED &&
                        !r.analysisMarkdown &&
                        !r.campaignBriefMarkdown && (
                          <p className="text-muted-foreground">No output stored for this run.</p>
                        )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
