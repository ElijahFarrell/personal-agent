'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Copy,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import { normalizeEmailPlainText } from '@/lib/inboxEmailText'
import { InboxMessageMarkdown } from '@/components/inbox/InboxMessageMarkdown'

type SortOrder = 'recent' | 'lead_score' | 'needs_reply_first'

type ProviderSyncPayload = { threadsSynced: number; error?: string }

type LastSyncSummary = {
  gmail: ProviderSyncPayload
  outlook: ProviderSyncPayload
}

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

  const [threadMessages, setThreadMessages] = useState<
    | {
        externalMessageId: string
        sentAt: number
        fromEmail: string
        isOutbound: boolean
        bodyPlain: string
        senderLabel?: string
      }[]
    | null
  >(null)
  const [threadMessagesLoading, setThreadMessagesLoading] = useState(false)
  const [threadMessagesError, setThreadMessagesError] = useState<string | null>(null)

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncSummary, setLastSyncSummary] = useState<LastSyncSummary | null>(null)
  const [syncMeta, setSyncMeta] = useState<{ usedToday: number; limit: number } | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftText, setDraftText] = useState<string | null>(null)
  const [draftMode, setDraftMode] = useState<'reply' | 'summarize' | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [copyDone, setCopyDone] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const [composeReply, setComposeReply] = useState('')
  const [sendReplyLoading, setSendReplyLoading] = useState(false)
  const [sendReplyError, setSendReplyError] = useState<string | null>(null)
  const [sendReplyOk, setSendReplyOk] = useState(false)

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

  const autoSyncStartedRef = useRef(false)

  useEffect(() => {
    if (!threads?.length) {
      setSelectedId(null)
      return
    }
    if (selectedId && !threads.some((t) => t._id === selectedId)) {
      setSelectedId(null)
    }
  }, [threads, selectedId])

  const [messagesRefreshEpoch, setMessagesRefreshEpoch] = useState(0)

  useEffect(() => {
    if (!selectedId || !dbUser) {
      setThreadMessages(null)
      setThreadMessagesError(null)
      setThreadMessagesLoading(false)
      return
    }
    let cancelled = false
    setThreadMessagesLoading(true)
    setThreadMessagesError(null)
    setThreadMessages(null)
    void (async () => {
      try {
        const res = await fetch(
          `/api/inbox/thread-messages?threadId=${encodeURIComponent(selectedId)}`,
          { credentials: 'same-origin' }
        )
        const data = (await res.json()) as {
          error?: string
          messages?: {
            externalMessageId: string
            sentAt: number
            fromEmail: string
            isOutbound: boolean
            bodyPlain: string
            senderLabel?: string
          }[]
        }
        if (!res.ok) throw new Error(data.error ?? 'Failed to load messages')
        if (!cancelled) setThreadMessages(data.messages ?? [])
      } catch (e) {
        if (!cancelled) {
          setThreadMessagesError(e instanceof Error ? e.message : 'Failed to load messages')
          setThreadMessages([])
        }
      } finally {
        if (!cancelled) setThreadMessagesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, dbUser, messagesRefreshEpoch])

  /** One automatic sync when you open Inbox (once per tab session), if under daily limit. */
  useEffect(() => {
    if (!enabled || !dbUser || typeof window === 'undefined') return
    const SESSION_KEY = 'inbox.autoSyncSession.v1'
    if (sessionStorage.getItem(SESSION_KEY)) return
    if (autoSyncStartedRef.current) return
    autoSyncStartedRef.current = true

    void (async () => {
      try {
        const st = await fetch('/api/inbox/sync-status', { credentials: 'same-origin' }).then(
          (r) => r.json() as Promise<{ enabled?: boolean; usedToday?: number; limit?: number }>
        )
        if (!st.enabled) return
        if (st.limit != null && st.limit >= 0 && st.usedToday != null && st.usedToday >= st.limit) {
          return
        }
        const res = await fetch('/api/inbox/sync', { method: 'POST', credentials: 'same-origin' })
        const data = (await res.json()) as {
          gmail?: ProviderSyncPayload
          outlook?: ProviderSyncPayload
        }
        if (res.ok && data.gmail && data.outlook) {
          sessionStorage.setItem(SESSION_KEY, '1')
          setLastSyncSummary({ gmail: data.gmail, outlook: data.outlook })
          const providerErrors = [data.gmail?.error, data.outlook?.error].filter(
            (x): x is string => typeof x === 'string' && x.length > 0
          )
          if (providerErrors.length > 0) setSyncError(providerErrors.join(' · '))
        }
        refreshSyncStatus()
      } catch {
        autoSyncStartedRef.current = false
      }
    })()
  }, [enabled, dbUser, refreshSyncStatus])

  /** Background pull sync while Inbox stays open: every 5 minutes, only if under daily limit. */
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
          const res = await fetch('/api/inbox/sync', { method: 'POST', credentials: 'same-origin' })
          const data = (await res.json()) as {
            gmail?: ProviderSyncPayload
            outlook?: ProviderSyncPayload
          }
          if (res.ok && data.gmail && data.outlook) {
            setLastSyncSummary({ gmail: data.gmail, outlook: data.outlook })
          }
          refreshSyncStatus()
        } catch {
          /* ignore */
        }
      })()
    }, 300_000)
    return () => window.clearInterval(id)
  }, [enabled, dbUser, refreshSyncStatus])

  async function sync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/inbox/sync', { method: 'POST', credentials: 'same-origin' })
      const data = (await res.json()) as {
        error?: string
        gmail?: ProviderSyncPayload
        outlook?: ProviderSyncPayload
      }
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      if (data.gmail && data.outlook) {
        setLastSyncSummary({ gmail: data.gmail, outlook: data.outlook })
      }
      const providerErrors = [data.gmail?.error, data.outlook?.error].filter(
        (x): x is string => typeof x === 'string' && x.length > 0
      )
      if (providerErrors.length > 0) {
        setSyncError(providerErrors.join(' · '))
      }
      refreshSyncStatus()
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function sendReply() {
    if (!selectedId || !composeReply.trim()) return
    setSendReplyLoading(true)
    setSendReplyError(null)
    setSendReplyOk(false)
    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ threadId: selectedId, body: composeReply }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      setComposeReply('')
      setSendReplyOk(true)
      window.setTimeout(() => setSendReplyOk(false), 4000)
      setMessagesRefreshEpoch((n) => n + 1)
    } catch (e) {
      setSendReplyError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSendReplyLoading(false)
    }
  }

  async function runDraft(mode: 'reply' | 'summarize') {
    if (!selectedId) return
    setDraftLoading(true)
    setDraftError(null)
    setDraftText(null)
    setDraftMode(null)
    try {
      const res = await fetch('/api/inbox/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ threadId: selectedId, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Draft failed')
      const text = data.text ?? ''
      setDraftText(text)
      setDraftMode(mode)
      if (mode === 'reply') setReplyDraft(text)
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
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 p-3 md:p-4 lg:flex-row">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 lg:max-w-md lg:shrink-0 lg:overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
              <Inbox className="h-5 w-5 shrink-0 text-muted-foreground" />
              Inbox
            </h1>
            <p className="text-xs text-muted-foreground">
              Gmail, Outlook, WhatsApp (webhook). ~30 days. Auto-sync when you open this page & every
              5 min.
            </p>
            <details className="mt-1 text-xs text-muted-foreground [&_summary]:cursor-pointer [&_summary]:text-muted-foreground">
              <summary className="list-none [&::-webkit-details-marker]:hidden">
                How sync works
              </summary>
              <p className="mt-1.5 pl-0 text-muted-foreground">
                Sync pulls the last ~30 days. Auto-sync runs once when you open Inbox (per tab session)
                and every 5 minutes while you stay on this page.
              </p>
            </details>
            {syncMeta && syncMeta.limit >= 0 && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Syncs today: {syncMeta.usedToday} / {syncMeta.limit}
              </p>
            )}
            {lastSyncSummary && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Last sync — Gmail: {lastSyncSummary.gmail.threadsSynced} threads · Outlook:{' '}
                {lastSyncSummary.outlook.threadsSynced} threads
              </p>
            )}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => void sync()} disabled={syncing}>
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
          <span className="text-xs text-muted-foreground">Sort</span>
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as SortOrder)}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
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

        <div className="flex min-h-0 flex-1 flex-col">
          {!threads && (
            <div className="flex flex-1 items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {threads && threads.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No threads yet. Connect Gmail or Outlook and sync.
              </CardContent>
            </Card>
          )}

          {threads && threads.length > 0 && (
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
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
                        setDraftMode(null)
                        setReplyDraft('')
                        setDraftError(null)
                        setComposeReply('')
                        setSendReplyError(null)
                        setSendReplyOk(false)
                      }}
                      className={`flex w-full items-start gap-2 rounded-lg border p-2 text-left text-sm transition-colors ${
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
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground break-words">
                          {normalizeEmailPlainText(t.snippet ?? '')}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
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
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto border-t border-border pt-3 lg:min-h-0 lg:flex-1 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
        {!selectedThread && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Select a thread to view messages and run AI draft or summary.
            </CardContent>
          </Card>
        )}

        {selectedThread && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <Card className="shrink-0">
              <CardHeader className="space-y-1.5 p-4 pb-2">
                <CardTitle className="text-base">{selectedThread.subject ?? '(no subject)'}</CardTitle>
                <CardDescription className="line-clamp-3 break-words">
                  {normalizeEmailPlainText(selectedThread.snippet ?? '')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 border-t border-border px-4 pb-4 pt-3">
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
            {draftText && draftMode && (
              <Card className="shrink-0">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 p-4 py-3">
                  <CardTitle className="text-sm">
                    {draftMode === 'reply' ? 'Reply draft' : 'Summary'}
                  </CardTitle>
                  {draftMode === 'reply' && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          void navigator.clipboard.writeText(replyDraft || draftText).then(() => {
                            setCopyDone(true)
                            window.setTimeout(() => setCopyDone(false), 2000)
                          })
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copyDone ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-4">
                  {draftMode === 'reply' ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Edit and copy to paste into Gmail or your mail client.
                      </p>
                      <Textarea
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        className="min-h-[140px] font-sans text-sm"
                        placeholder="Draft reply will appear here…"
                      />
                    </>
                  ) : (
                    <InboxMessageMarkdown text={draftText} density="compact" />
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CardHeader className="shrink-0 space-y-0 p-4 py-3">
                <CardTitle className="text-sm">Messages</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pr-3 pt-0">
                {threadMessagesLoading && (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                )}
                {threadMessagesError && (
                  <p className="text-sm text-destructive" role="alert">
                    {threadMessagesError}
                  </p>
                )}
                {!threadMessagesLoading && threadMessages && threadMessages.length === 0 && !threadMessagesError && (
                  <p className="text-sm text-muted-foreground">No messages in this thread.</p>
                )}
                {!threadMessagesLoading && threadMessages && threadMessages.length > 0 && (
                  <ul className="space-y-3">
                    {threadMessages.map((m) => (
                      <li
                        key={m.externalMessageId}
                        className={`rounded-md border p-3 ${
                          m.isOutbound ? 'border-muted bg-muted/30' : 'border-border'
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {m.isOutbound ? 'You' : m.senderLabel || m.fromEmail}
                          </span>
                          <span className="tabular-nums">
                            {new Date(m.sentAt).toLocaleString()}
                          </span>
                        </div>
                        <InboxMessageMarkdown
                          text={normalizeEmailPlainText(m.bodyPlain ?? '') || '—'}
                          density="compact"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="shrink-0">
              <CardHeader className="space-y-1 p-4 py-3">
                <CardTitle className="text-sm">Reply</CardTitle>
                <CardDescription>
                  {selectedThread.provider === 'whatsapp'
                    ? 'Sending from this screen is not available for WhatsApp. Use the chat agent or your phone.'
                    : 'Sends through your connected Gmail or Outlook account (Composio).'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                {sendReplyError && (
                  <p className="text-sm text-destructive" role="alert">
                    {sendReplyError}
                  </p>
                )}
                {sendReplyOk && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
                    Reply sent.
                  </p>
                )}
                <Textarea
                  value={composeReply}
                  onChange={(e) => setComposeReply(e.target.value)}
                  placeholder="Write a reply…"
                  disabled={selectedThread.provider === 'whatsapp' || sendReplyLoading}
                  className="min-h-[120px] resize-y font-sans text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      selectedThread.provider === 'whatsapp' ||
                      sendReplyLoading ||
                      !composeReply.trim()
                    }
                    onClick={() => void sendReply()}
                    className="gap-1.5"
                  >
                    {sendReplyLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send reply
                  </Button>
                  {draftMode === 'reply' && replyDraft && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={selectedThread.provider === 'whatsapp'}
                      onClick={() => setComposeReply(replyDraft)}
                    >
                      Use AI draft
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
