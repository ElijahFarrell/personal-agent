'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  Inbox,
  Loader2,
  RefreshCw,
  Sparkles,
  ListOrdered,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isFeatureEnabled } from '@/constants/featureGating'

type SortOrder = 'recent' | 'lead_score' | 'needs_reply_first'

export default function InboxPage() {
  const { user } = useUser()
  const { config } = useOrgConfig()
  const enabled = isFeatureEnabled(config, 'unifiedInbox')
  const leadScoring = isFeatureEnabled(config, 'leadScoring')

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const [sortOrder, setSortOrder] = useState<SortOrder>('needs_reply_first')
  const [selectedId, setSelectedId] = useState<Id<'inboxThreads'> | null>(null)

  const threads = useQuery(
    api.inbox.listThreadsForUser,
    dbUser && enabled
      ? { userId: dbUser._id, limit: 80, sortOrder }
      : 'skip'
  )

  const prospects = useQuery(
    api.prospects.getProspectsByTenantId,
    dbUser && leadScoring ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const scoreByProspect = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of prospects ?? []) {
      if (p.leadScore !== undefined) m.set(String(p._id), p.leadScore)
    }
    return m
  }, [prospects])

  const messages = useQuery(
    api.inbox.listMessagesForThread,
    dbUser && selectedId
      ? { threadId: selectedId, limit: 200 }
      : 'skip'
  )

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncMeta, setSyncMeta] = useState<{ usedToday: number; limit: number } | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftText, setDraftText] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)

  const refreshSyncStatus = useCallback(() => {
    fetch('/api/inbox/sync-status', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { usedToday?: number; limit?: number }) => {
        if (typeof d.usedToday === 'number' && typeof d.limit === 'number') {
          setSyncMeta({ usedToday: d.usedToday, limit: d.limit })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshSyncStatus()
  }, [refreshSyncStatus])

  useEffect(() => {
    if (!threads?.length) {
      setSelectedId(null)
      return
    }
    if (selectedId && !threads.some((t) => t._id === selectedId)) {
      setSelectedId(null)
    }
  }, [threads, selectedId])

  // Optional pull sync while the page is open: every 15m, only if under daily limit.
  useEffect(() => {
    if (!enabled || !dbUser) return
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const st = await fetch('/api/inbox/sync-status', { credentials: 'same-origin' }).then(
            (r) => r.json() as Promise<{ enabled?: boolean; usedToday?: number; limit?: number }>
          )
          if (!st.enabled) return
          if (st.limit != null && st.limit >= 0 && st.usedToday != null && st.usedToday >= st.limit) {
            return
          }
          await fetch('/api/inbox/sync', { method: 'POST', credentials: 'same-origin' })
          refreshSyncStatus()
        } catch {
          /* ignore */
        }
      })()
    }, 900_000)
    return () => window.clearInterval(id)
  }, [enabled, dbUser, refreshSyncStatus])

  async function sync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/inbox/sync', { method: 'POST', credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      refreshSyncStatus()
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function runDraft(mode: 'reply' | 'summarize') {
    if (!selectedId) return
    setDraftLoading(true)
    setDraftError(null)
    setDraftText(null)
    try {
      const res = await fetch('/api/inbox/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ threadId: selectedId, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Draft failed')
      setDraftText(data.text ?? '')
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Draft failed')
    } finally {
      setDraftLoading(false)
    }
  }

  if (!enabled) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unified inbox</CardTitle>
            <CardDescription>
              This feature is not enabled for your organization. Contact your admin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const selectedThread = threads?.find((t) => t._id === selectedId)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6 lg:flex-row">
      <div className="flex min-h-0 w-full min-w-0 flex-col gap-4 lg:max-w-md lg:shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Inbox className="h-7 w-7 text-muted-foreground" />
              Inbox
            </h1>
            <p className="text-sm text-muted-foreground">
              Gmail, Outlook, and WhatsApp (via webhook). Sync pulls the last ~30 days.
            </p>
            {syncMeta && syncMeta.limit >= 0 && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Syncs today: {syncMeta.usedToday} / {syncMeta.limit}
              </p>
            )}
          </div>
          <Button type="button" variant="secondary" onClick={() => void sync()} disabled={syncing}>
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ListOrdered className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sort</span>
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as SortOrder)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="needs_reply_first">Needs reply first</SelectItem>
              <SelectItem value="recent">Recent activity</SelectItem>
              {leadScoring && <SelectItem value="lead_score">Lead score</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        {syncError && (
          <p className="text-sm text-destructive" role="alert">
            {syncError}
          </p>
        )}

        {!threads && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {threads && threads.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No threads yet. Connect Gmail or Outlook and sync.
            </CardContent>
          </Card>
        )}

        {threads && threads.length > 0 && (
          <ul className="max-h-[calc(100vh-12rem)] space-y-2 overflow-y-auto pr-1">
            {threads.map((t) => {
              const score =
                leadScoring && t.prospectId
                  ? scoreByProspect.get(String(t.prospectId))
                  : undefined
              const active = selectedId === t._id
              return (
                <li key={t._id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(t._id)
                      setDraftText(null)
                      setDraftError(null)
                    }}
                    className={`flex w-full items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
                      active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <ChevronRight
                      className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 font-medium">
                        {t.subject ?? '(no subject)'}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {t.snippet ?? ''}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {t.provider}
                        </span>
                        {t.needsReply && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                            Needs reply
                          </span>
                        )}
                        {score !== undefined && (
                          <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-700 dark:text-violet-300">
                            Score {score}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        {!selectedThread && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              Select a thread to view messages and run AI draft or summary.
            </CardContent>
          </Card>
        )}

        {selectedThread && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{selectedThread.subject ?? '(no subject)'}</CardTitle>
                <CardDescription className="line-clamp-3">{selectedThread.snippet}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={draftLoading}
                  onClick={() => void runDraft('reply')}
                  className="gap-1.5"
                >
                  {draftLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Draft reply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={draftLoading}
                  onClick={() => void runDraft('summarize')}
                >
                  Summarize
                </Button>
              </CardContent>
            </Card>

            {draftError && (
              <p className="text-sm text-destructive" role="alert">
                {draftError}
              </p>
            )}
            {draftText && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">AI output</CardTitle>
                </CardHeader>
                <CardContent className="whitespace-pre-wrap text-sm">{draftText}</CardContent>
              </Card>
            )}

            <Card className="min-h-0 flex-1 overflow-hidden">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Messages</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[min(480px,50vh)] overflow-y-auto">
                {!messages && (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                )}
                {messages && messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">No messages stored for this thread.</p>
                )}
                {messages && messages.length > 0 && (
                  <ul className="space-y-3">
                    {messages.map((m) => (
                      <li
                        key={m._id}
                        className={`rounded-md border p-3 text-sm ${
                          m.isOutbound ? 'border-muted bg-muted/30' : 'border-border'
                        }`}
                      >
                        <div className="mb-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{m.isOutbound ? 'You' : m.senderLabel || m.fromEmail}</span>
                          <span className="tabular-nums">
                            {new Date(m.sentAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.bodyPreview}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
