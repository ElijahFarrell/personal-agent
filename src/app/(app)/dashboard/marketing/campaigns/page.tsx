'use client'

import { useCallback, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { MARKETING_METRIC_SOURCE } from '@convex/constants'
import { Loader2, Megaphone, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { API_ROUTES } from '@/constants/api'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isIntegrationAllowed } from '@/constants/featureGating'

export default function MarketingCampaignsPage() {
  const { user } = useUser()
  const { config } = useOrgConfig()
  const lemlistAllowed = isIntegrationAllowed(config, 'lemlist')

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const rows = useQuery(
    api.marketingMetrics.listForUser,
    dbUser
      ? {
          userId: dbUser._id,
          source: MARKETING_METRIC_SOURCE.LEMLIST,
          limit: 200,
        }
      : 'skip'
  )

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncOk, setSyncOk] = useState<string | null>(null)

  const totals = useMemo(() => {
    if (!rows?.length) return { sent: 0, replied: 0, opened: 0 }
    let sent = 0
    let replied = 0
    let opened = 0
    for (const r of rows) {
      sent += r.metrics.sent ?? 0
      replied += r.metrics.replied ?? 0
      opened += r.metrics.opened ?? 0
    }
    return { sent, replied, opened }
  }, [rows])

  const lastSynced = useMemo(() => {
    if (!rows?.length) return null
    return Math.max(...rows.map((r) => r.syncedAt))
  }, [rows])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncError(null)
    setSyncOk(null)
    try {
      const res = await fetch(API_ROUTES.marketingSyncMetrics, {
        method: 'POST',
        credentials: 'same-origin',
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        inserted?: number
        reason?: string
      }
      if (!res.ok) {
        throw new Error(data.error ?? 'Sync failed')
      }
      if (data.ok === false && data.reason === 'no_campaigns') {
        setSyncError('No campaigns or stats returned. Check Lemlist and try again.')
        return
      }
      if (data.inserted !== undefined) {
        setSyncOk(`Synced ${data.inserted} campaign(s).`)
      } else {
        setSyncOk('Sync completed.')
      }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [])

  const loading = dbUser === undefined || rows === undefined

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Campaign metrics</h1>
          <p className="text-sm text-muted-foreground">
            Lemlist campaign stats (last 30 days per sync). Synced automatically and stored for
            quick viewing.
          </p>
        </div>
        {lemlistAllowed && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={syncing || !dbUser}
            onClick={() => void handleSync()}
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync from Lemlist
          </Button>
        )}
      </div>

      <div className="space-y-6 p-6">
        {!lemlistAllowed && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-base">Lemlist not enabled</CardTitle>
              <CardDescription>
                Your organization has not enabled the Lemlist integration. Ask an admin to allow it
                in org settings.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {syncError && (
          <p className="text-sm text-destructive" role="alert">
            {syncError}
          </p>
        )}
        {syncOk && (
          <p className="text-sm text-muted-foreground" role="status">
            {syncOk}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sent (sum)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{totals.sent}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Replied (sum)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{totals.replied}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Opened (sum)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{totals.opened}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {lastSynced && (
          <p className="text-xs text-muted-foreground">
            Last synced: {new Date(lastSynced).toLocaleString()}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lemlist campaigns</CardTitle>
            <CardDescription>
              One row per campaign from the latest sync. Connect Lemlist under Integrations, then
              use &quot;Sync from Lemlist&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : !rows?.length ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <Megaphone className="h-10 w-10 text-muted-foreground/50" />
                <p className="max-w-sm text-sm text-muted-foreground">
                  No metrics yet. Connect Lemlist and run a sync to see sent, replies, and opens.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Replied</TableHead>
                    <TableHead className="text-right">Opened</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.metrics.sent ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.metrics.replied ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.metrics.opened ?? '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="font-normal">
                          lemlist
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
