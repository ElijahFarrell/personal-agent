'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Inbox, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isFeatureEnabled } from '@/constants/featureGating'

export default function InboxPage() {
  const { user } = useUser()
  const { config } = useOrgConfig()
  const enabled = isFeatureEnabled(config, 'unifiedInbox')

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const threads = useQuery(
    api.inbox.listThreadsForUser,
    dbUser && enabled ? { userId: dbUser._id, limit: 80 } : 'skip'
  )

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function sync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/inbox/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
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

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Inbox className="h-7 w-7 text-muted-foreground" />
            Inbox
          </h1>
          <p className="text-muted-foreground">
            Gmail threads synced into your workspace. Connect Gmail under Integrations, then sync.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void sync()} disabled={syncing}>
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync now
        </Button>
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
            No threads yet. Connect Gmail and sync to see conversations.
          </CardContent>
        </Card>
      )}

      {threads && threads.length > 0 && (
        <div className="space-y-2">
          {threads.map((t) => (
            <Card key={t._id}>
              <CardHeader className="py-3">
                <CardTitle className="text-base">{t.subject ?? '(no subject)'}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {t.snippet ?? ''}
                </CardDescription>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5">{t.provider}</span>
                  {t.needsReply && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-600">
                      Needs reply
                    </span>
                  )}
                  {t.prospectId && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                      Linked prospect
                    </span>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
