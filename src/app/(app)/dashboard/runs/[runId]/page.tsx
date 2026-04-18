'use client'

/**
 * Agent Run Viewer — Phase 0 minimal UI.
 *
 * Shows the run header, plan, delegation tree, live progress log, and
 * artifacts produced by an agent run. Convex queries keep everything live
 * without any polling on our side.
 */
import { use } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import {
  ArrowLeft,
  CircleDashed,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Loader2,
  FileText,
  Boxes,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AGENT_RUN_STATUS } from '@convex/constants'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type RunStatus = (typeof AGENT_RUN_STATUS)[keyof typeof AGENT_RUN_STATUS]

const STATUS_META: Record<
  RunStatus,
  { label: string; tone: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  [AGENT_RUN_STATUS.PENDING]: { label: 'Pending', tone: 'secondary' },
  [AGENT_RUN_STATUS.RUNNING]: { label: 'Running', tone: 'default' },
  [AGENT_RUN_STATUS.SUSPENDED]: { label: 'Suspended', tone: 'outline' },
  [AGENT_RUN_STATUS.COMPLETED]: { label: 'Completed', tone: 'default' },
  [AGENT_RUN_STATUS.FAILED]: { label: 'Failed', tone: 'destructive' },
  [AGENT_RUN_STATUS.CANCELLED]: { label: 'Cancelled', tone: 'outline' },
}

function StatusIcon({ status }: { status: RunStatus }) {
  switch (status) {
    case AGENT_RUN_STATUS.RUNNING:
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    case AGENT_RUN_STATUS.COMPLETED:
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case AGENT_RUN_STATUS.FAILED:
      return <XCircle className="h-4 w-4 text-red-500" />
    case AGENT_RUN_STATUS.SUSPENDED:
      return <PauseCircle className="h-4 w-4 text-amber-500" />
    case AGENT_RUN_STATUS.CANCELLED:
      return <XCircle className="h-4 w-4 text-muted-foreground" />
    default:
      return <CircleDashed className="h-4 w-4 text-muted-foreground" />
  }
}

function formatTime(ms: number | undefined): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleString()
}

export default function RunViewerPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = use(params)
  const typedRunId = runId as Id<'agentRuns'>

  const tree = useQuery(api.agentRuns.getWithChildren, { runId: typedRunId })
  const progress = useQuery(api.runProgress.listForRun, {
    runId: typedRunId,
    limit: 300,
  })
  const artifacts = useQuery(api.artifacts.listForRun, { runId: typedRunId })

  if (tree === undefined) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (tree === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Run <code>{runId}</code> was not found or you do not have access.
          </p>
        </div>
      </div>
    )
  }

  const { run, children } = tree
  const status = run.status as RunStatus
  const meta = STATUS_META[status] ?? STATUS_META[AGENT_RUN_STATUS.PENDING]

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <Badge variant={meta.tone} className="gap-1">
          <StatusIcon status={status} /> {meta.label}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            {run.title ?? run.agentId}
          </CardTitle>
          <CardDescription>
            Agent <code>{run.agentId}</code> · Started {formatTime(run.startedAt ?? run.createdAt)}
            {run.completedAt ? ` · Completed ${formatTime(run.completedAt)}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {run.threadId ? (
            <div>
              <span className="text-muted-foreground">Thread:</span>{' '}
              <code>{run.threadId}</code>
            </div>
          ) : null}
          {run.tracingTags?.length ? (
            <div className="flex flex-wrap gap-1">
              {run.tracingTags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
          {run.error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {run.error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {run.plan ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
              {typeof run.plan === 'string'
                ? run.plan
                : JSON.stringify(run.plan, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delegations</CardTitle>
          <CardDescription>
            Sub-agents invoked by this run ({children.length}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {children.length === 0 ? (
            <p className="text-sm text-muted-foreground">No delegations yet.</p>
          ) : (
            <ul className="space-y-2">
              {children.map((child) => {
                const childStatus = child.status as RunStatus
                const childMeta =
                  STATUS_META[childStatus] ??
                  STATUS_META[AGENT_RUN_STATUS.PENDING]
                return (
                  <li key={child._id}>
                    <Link
                      href={`/dashboard/runs/${child._id}`}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <StatusIcon status={childStatus} />
                        <div>
                          <div className="font-medium">
                            {child.title ?? child.agentId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {child.agentId} · {formatTime(child.createdAt)}
                          </div>
                        </div>
                      </div>
                      <Badge variant={childMeta.tone}>{childMeta.label}</Badge>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
          <CardDescription>
            Live milestone log ({progress?.length ?? 0}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!progress || progress.length === 0 ? (
            <p className="text-sm text-muted-foreground">Waiting for progress…</p>
          ) : (
            <ol className="space-y-2">
              {progress.map((entry) => (
                <li
                  key={entry._id}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {entry.kind}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(entry.createdAt)}
                    </span>
                  </div>
                  {entry.message ? (
                    <p className="mt-1 text-sm">{entry.message}</p>
                  ) : null}
                  {entry.data ? (
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs">
                      {JSON.stringify(entry.data, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Boxes className="h-4 w-4" /> Artifacts
          </CardTitle>
          <CardDescription>
            Structured payloads produced by this run ({artifacts?.length ?? 0}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!artifacts || artifacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No artifacts yet. Tools should persist large outputs via
              <code className="mx-1">artifacts.create</code>.
            </p>
          ) : (
            <ul className="space-y-2">
              {artifacts.map((artifact) => (
                <li
                  key={artifact._id}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {artifact.title ?? artifact.kind}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {artifact.kind}
                    </span>
                  </div>
                  {artifact.summary ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {artifact.summary}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
