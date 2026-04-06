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
  ChevronRight,
  Copy,
  Send,
  Phone,
  Mail,
  MessageSquare,
  ArrowUp,
  Clock,
  CheckCheck,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { cn } from '@/lib/utils'

type SortOrder = 'recent' | 'lead_score' | 'needs_reply_first'

type ProviderSyncPayload = { threadsSynced: number; error?: string }

type LastSyncSummary = {
  gmail: ProviderSyncPayload
  outlook: ProviderSyncPayload
}

function providerIcon(provider: string) {
  switch (provider) {
    case 'gmail':
    case 'outlook':
      return <Mail className="h-3 w-3" />
    case 'sms':
      return <MessageSquare className="h-3 w-3" />
    case 'whatsapp':
      return <MessageSquare className="h-3 w-3" />
    default:
      return <Mail className="h-3 w-3" />
  }
}

function formatRelativeTime(ms: number): string {
  const now = Date.now()
  const diff = now - ms
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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

  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const selectedProviderRaw = threads?.find((t) => t._id === selectedId)?.provider
  const isRealtimeProvider =
    selectedProviderRaw === 'sms' || selectedProviderRaw === 'whatsapp'

  const realtimeMessages = useQuery(
    api.inbox.listMessagesForThread,
    selectedId && isRealtimeProvider ? { threadId: selectedId, limit: 200 } : 'skip'
  )

  useEffect(() => {
    if (!selectedId || !dbUser) {
      setThreadMessages(null)
      setThreadMessagesError(null)
      setThreadMessagesLoading(false)
      return
    }
    if (isRealtimeProvider) {
      if (realtimeMessages) {
        setThreadMessages(
          realtimeMessages.map((m) => ({
            externalMessageId: m.externalMessageId,
            sentAt: m.sentAt,
            fromEmail: m.fromEmail,
            isOutbound: m.isOutbound,
            bodyPlain: m.bodyPreview,
            senderLabel: m.senderLabel,
          }))
        )
        setThreadMessagesLoading(false)
      } else {
        setThreadMessagesLoading(true)
      }
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
  }, [selectedId, dbUser, messagesRefreshEpoch, isRealtimeProvider, realtimeMessages])

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
    }, 30_000)
    return () => window.clearInterval(id)
  }, [enabled, dbUser, refreshSyncStatus])

  useEffect(() => {
    if (threadMessages && threadMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [threadMessages])

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
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">Unified Inbox</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This feature is not enabled for your organization. Contact your admin.
          </p>
        </div>
      </div>
    )
  }

  const selectedThread = threads?.find((t) => t._id === selectedId)

  const gmailCount = threads?.filter((t) => t.provider === 'gmail').length ?? 0
  const outlookCount = threads?.filter((t) => t.provider === 'outlook').length ?? 0

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col lg:flex-row">
      {/* ─── Thread list panel ─── */}
      <div className="flex min-h-0 w-full min-w-0 flex-col border-b border-border/50 lg:w-[380px] lg:shrink-0 lg:border-b-0 lg:border-r">
        {/* Header */}
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Inbox className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight">Inbox</h1>
                <p className="text-[11px] text-muted-foreground">
                  {threads ? `${threads.length} threads` : 'Loading…'}
                  {gmailCount > 0 && ` · Gmail: ${gmailCount}`}
                  {outlookCount > 0 && ` · Outlook: ${outlookCount}`}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void sync()}
              disabled={syncing}
              className="h-8 w-8 rounded-lg"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {syncMeta && syncMeta.limit >= 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all"
                  style={{ width: `${Math.min((syncMeta.usedToday / syncMeta.limit) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {syncMeta.usedToday}/{syncMeta.limit}
              </span>
            </div>
          )}

          {lastSyncSummary && (
            <p className="mt-1.5 text-[10px] text-muted-foreground/70">
              Last sync — Gmail: {lastSyncSummary.gmail.threadsSynced} · Outlook:{' '}
              {lastSyncSummary.outlook.threadsSynced}
            </p>
          )}
        </div>

        {/* Sort bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border/30 px-4 py-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Sort
          </span>
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as SortOrder)}
          >
            <SelectTrigger className="h-7 w-auto min-w-[140px] border-0 bg-transparent px-2 text-[11px] shadow-none focus:ring-0">
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
          <div className="mx-4 mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
            {syncError}
          </div>
        )}

        {/* Thread list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!threads && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
            </div>
          )}

          {threads && threads.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <Mail className="mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No threads yet</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Connect Gmail, Outlook, or an SMS provider and sync.
              </p>
            </div>
          )}

          {threads && threads.length > 0 && (
            <div className="divide-y divide-border/30">
              {threads.map((t) => {
                const score =
                  leadScoring && t.prospectId
                    ? scoreByProspect.get(String(t.prospectId))
                    : undefined
                const active = selectedId === t._id
                return (
                  <button
                    key={t._id}
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
                    className={cn(
                      'group flex w-full items-start gap-3 px-4 py-3 text-left transition-all',
                      active
                        ? 'bg-primary/5 shadow-[inset_3px_0_0_0] shadow-primary'
                        : 'hover:bg-muted/30'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                        active
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {providerIcon(t.provider)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'line-clamp-1 flex-1 text-[13px]',
                          t.needsReply ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                        )}>
                          {t.subject ?? '(no subject)'}
                        </span>
                        {t.lastMessageAt && (
                          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
                            {formatRelativeTime(t.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground/70">
                        {normalizeEmailPlainText(t.snippet ?? '')}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="h-[18px] gap-1 rounded-md border-0 bg-muted/80 px-1.5 py-0 text-[10px] font-normal uppercase tracking-wide text-muted-foreground"
                        >
                          {t.provider}
                        </Badge>
                        {t.needsReply && (
                          <Badge className="h-[18px] rounded-md border-0 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            Needs reply
                          </Badge>
                        )}
                        {score !== undefined && (
                          <Badge className="h-[18px] rounded-md border-0 bg-violet-500/10 px-1.5 py-0 text-[10px] font-medium text-violet-600 dark:text-violet-300">
                            Score {score}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Detail panel ─── */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!selectedThread && (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <Mail className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground/70">
              Select a conversation
            </p>
            <p className="mt-1 text-xs text-muted-foreground/50">
              Choose a thread from the left to view messages
            </p>
          </div>
        )}

        {selectedThread && (
          <>
            {/* Thread header */}
            <div className="shrink-0 border-b border-border/50 px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold leading-tight tracking-tight">
                    {selectedThread.subject ?? '(no subject)'}
                  </h2>
                  {selectedThread.snippet && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/60">
                      {normalizeEmailPlainText(selectedThread.snippet)}
                    </p>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1 rounded-md border-0 bg-muted/60 text-[10px] uppercase"
                >
                  {providerIcon(selectedThread.provider)}
                  {selectedThread.provider}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={draftLoading}
                  onClick={() => void runDraft('reply')}
                  className="h-7 gap-1.5 rounded-lg px-3 text-xs"
                >
                  {draftLoading && draftMode !== 'summarize' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Draft reply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={draftLoading}
                  onClick={() => void runDraft('summarize')}
                  className="h-7 gap-1.5 rounded-lg px-3 text-xs"
                >
                  <FileText className="h-3 w-3" />
                  Summarize
                </Button>
                {(selectedThread.provider === 'sms' || selectedThread.provider === 'whatsapp') && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 rounded-lg px-3 text-xs"
                    onClick={() => {
                      const phone = selectedThread.externalThreadId
                      if (phone) {
                        window.dispatchEvent(
                          new CustomEvent('shiloh:start-call', {
                            detail: { phone, prospectId: selectedThread.prospectId },
                          })
                        )
                      }
                    }}
                  >
                    <Phone className="h-3 w-3" />
                    Call
                  </Button>
                )}
              </div>
            </div>

            {/* AI draft/summary card */}
            {draftError && (
              <div className="mx-5 mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                {draftError}
              </div>
            )}
            {draftText && draftMode && (
              <div className="mx-5 mt-3 shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.03]">
                <div className="flex items-center justify-between border-b border-primary/10 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                    <span className="text-xs font-medium text-primary/80">
                      {draftMode === 'reply' ? 'AI Draft' : 'Summary'}
                    </span>
                  </div>
                  {draftMode === 'reply' && (
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 gap-1 px-2 text-[11px]"
                        onClick={() => {
                          void navigator.clipboard.writeText(replyDraft || draftText).then(() => {
                            setCopyDone(true)
                            window.setTimeout(() => setCopyDone(false), 2000)
                          })
                        }}
                      >
                        <Copy className="h-3 w-3" />
                        {copyDone ? 'Copied' : 'Copy'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => setComposeReply(replyDraft || draftText)}
                      >
                        Use in reply
                      </Button>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3">
                  {draftMode === 'reply' ? (
                    <Textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      className="min-h-[80px] resize-y border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                      placeholder="Draft reply will appear here…"
                    />
                  ) : (
                    <InboxMessageMarkdown text={draftText} density="compact" />
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {threadMessagesLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                </div>
              )}
              {threadMessagesError && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                  {threadMessagesError}
                </div>
              )}
              {!threadMessagesLoading && threadMessages && threadMessages.length === 0 && !threadMessagesError && (
                <p className="py-8 text-center text-sm text-muted-foreground/50">
                  No messages in this thread.
                </p>
              )}
              {!threadMessagesLoading && threadMessages && threadMessages.length > 0 && (
                <div className="space-y-3">
                  {threadMessages.map((m, idx) => {
                    const isLast = idx === threadMessages.length - 1
                    return (
                      <div
                        key={m.externalMessageId}
                        className={cn(
                          'group/msg relative',
                          m.isOutbound ? 'pl-8' : 'pr-8'
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-3 transition-colors',
                            m.isOutbound
                              ? 'ml-auto bg-primary/[0.07] dark:bg-primary/10'
                              : 'bg-muted/40'
                          )}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <div
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold',
                                m.isOutbound
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-foreground/10 text-foreground/60'
                              )}
                            >
                              {m.isOutbound ? (
                                <ArrowUp className="h-2.5 w-2.5" />
                              ) : (
                                (m.senderLabel || m.fromEmail || '?')[0].toUpperCase()
                              )}
                            </div>
                            <span className="text-xs font-medium text-foreground/80">
                              {m.isOutbound ? 'You' : (m.senderLabel || m.fromEmail)}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(m.sentAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                            {m.isOutbound && isLast && (
                              <CheckCheck className="h-3 w-3 text-primary/50" />
                            )}
                          </div>
                          <InboxMessageMarkdown
                            text={normalizeEmailPlainText(m.bodyPlain ?? '') || '—'}
                            density="compact"
                          />
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Reply composer — compact inline bar */}
            <div className="shrink-0 border-t border-border/50 bg-background/50 px-5 py-3">
              {sendReplyError && (
                <div className="mb-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive" role="alert">
                  {sendReplyError}
                </div>
              )}
              {sendReplyOk && (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400" role="status">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Reply sent
                </div>
              )}
              <div className="flex items-end gap-2">
                <Textarea
                  value={composeReply}
                  onChange={(e) => setComposeReply(e.target.value)}
                  placeholder={
                    selectedThread.provider === 'sms'
                      ? 'Write an SMS reply…'
                      : 'Write a reply…'
                  }
                  disabled={sendReplyLoading}
                  className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-xl border-border/50 bg-muted/30 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/40"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      void sendReply()
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  disabled={sendReplyLoading || !composeReply.trim()}
                  onClick={() => void sendReply()}
                  className="h-[40px] w-[40px] shrink-0 rounded-xl"
                >
                  {sendReplyLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground/40">
                  {selectedThread.provider === 'sms'
                    ? 'Sends via SMS'
                    : selectedThread.provider === 'whatsapp'
                      ? 'Sends via WhatsApp'
                      : 'Sends via Gmail / Outlook'}
                </span>
                <span className="text-[10px] text-muted-foreground/30">
                  {navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to send
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
