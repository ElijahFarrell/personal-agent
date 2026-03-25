'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import {
  GitBranch,
  Plus,
  Play,
  Pencil,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  Loader2,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WorkflowRunResumeDialog } from '@/components/workflows/WorkflowRunResumeDialog'
import { WORKFLOW_RUN_STATUS } from '@convex/constants'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isFeatureEnabled } from '@/constants/featureGating'
import { Textarea } from '@/components/ui/textarea'

function WorkflowCard({
  wf,
  runLoadingId,
  deletingId,
  onRun,
  onDelete,
  onResumeSuspended,
}: {
  wf: { _id: Id<'workflowDefinitions'>; name: string; description?: string; version: number; isPublished: boolean }
  runLoadingId: Id<'workflowDefinitions'> | null
  deletingId: Id<'workflowDefinitions'> | null
  onRun: (id: Id<'workflowDefinitions'>, autoApprove: boolean) => void
  onDelete: (id: Id<'workflowDefinitions'>) => void
  onResumeSuspended: (runId: Id<'workflowRuns'>, stepId?: string, suspendPayload?: unknown) => void
}) {
  const runs = useQuery(
    api.workflowRuns.listByWorkflowDefinitionId,
    { workflowDefinitionId: wf._id, limit: 5 }
  )
  const suspendedRun = runs?.find((r) => r.status === WORKFLOW_RUN_STATUS.SUSPENDED)
  const [runsExpanded, setRunsExpanded] = useState(!!suspendedRun)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm">{wf.name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {wf.description ?? 'No description'}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/workflows/builder?id=${wf._id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRun(wf._id, false)}>
              {runLoadingId === wf._id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRun(wf._id, true)}>
              <Play className="mr-2 h-4 w-4" />
              Run (auto-approve)
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(wf._id)}
              disabled={deletingId === wf._id}
            >
              {deletingId === wf._id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>v{wf.version}</span>
          {wf.isPublished && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
              Published
            </span>
          )}
        </div>
        {suspendedRun && (
          <div className="mb-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Awaiting Approval
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onResumeSuspended(suspendedRun._id, suspendedRun.suspendedAt)}
              >
                Review
              </Button>
            </div>
          </div>
        )}
        {runs && runs.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setRunsExpanded(!runsExpanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {runsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Recent runs
            </button>
            {runsExpanded && (
              <ul className="mt-1 space-y-1">
                {runs.map((r) => {
                  const Icon =
                    r.status === WORKFLOW_RUN_STATUS.SUCCESS
                      ? CheckCircle2
                      : r.status === WORKFLOW_RUN_STATUS.FAILED
                        ? XCircle
                        : r.status === WORKFLOW_RUN_STATUS.SUSPENDED
                          ? UserCheck
                          : Clock
                  return (
                    <li
                      key={r._id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{r.status}</span>
                      <span className="text-muted-foreground shrink-0">
                        {new Date(r.startedAt).toLocaleDateString()}
                      </span>
                      {r.status === WORKFLOW_RUN_STATUS.SUSPENDED && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => onResumeSuspended(r._id, r.suspendedAt)}
                        >
                          Approve
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function WorkflowsPage() {
  const { user } = useUser()
  const { config } = useOrgConfig()
  const nlEnabled = isFeatureEnabled(config, 'workflowBuilder')
  const [nlPrompt, setNlPrompt] = useState('')
  const [nlPreview, setNlPreview] = useState<{
    plan: { name: string; description: string; steps: Array<{ label: string; agentId: string }> }
  } | null>(null)
  const [nlLoading, setNlLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<Id<'workflowDefinitions'> | null>(null)
  const [runLoadingId, setRunLoadingId] = useState<Id<'workflowDefinitions'> | null>(null)
  const [resumeDialog, setResumeDialog] = useState<{
    runId: Id<'workflowRuns'>
    stepId?: string
    suspendPayload?: unknown
  } | null>(null)

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const workflows = useQuery(
    api.workflowDefinitions.listByTenantId,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const handleRun = async (workflowId: Id<'workflowDefinitions'>, autoApprove: boolean) => {
    setRunLoadingId(workflowId)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputData: {}, autoApprove }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Run failed')
      if (data.status === 'suspended') {
        setResumeDialog({
          runId: data.runId,
          stepId: data.suspended?.[0],
        })
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setRunLoadingId(null)
    }
  }

  const handleResumeSuspended = (runId: Id<'workflowRuns'>, stepId?: string, _suspendPayload?: unknown) => {
    setResumeDialog({ runId, stepId })
  }

  const handleNlPreview = async () => {
    if (!nlPrompt.trim()) return
    setNlLoading(true)
    setNlPreview(null)
    try {
      const res = await fetch('/api/workflows/nl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: nlPrompt, save: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setNlPreview({ plan: data.plan })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setNlLoading(false)
    }
  }

  const handleNlSave = async () => {
    if (!nlPrompt.trim()) return
    setNlLoading(true)
    try {
      const res = await fetch('/api/workflows/nl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: nlPrompt, save: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setNlPrompt('')
      setNlPreview(null)
      window.alert(`Saved workflow ${data.plan?.name ?? ''}`)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setNlLoading(false)
    }
  }

  const handleDelete = async (workflowId: Id<'workflowDefinitions'>) => {
    setDeletingId(workflowId)
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Delete failed')
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Build and run automated workflows with agents, tools, and human approval steps.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/dashboard/workflows/builder">
              <Plus className="mr-2 h-4 w-4" />
              Graph builder
            </Link>
          </Button>
        </div>
      </div>

      {nlEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Describe an automation</CardTitle>
            <CardDescription>
              Natural language: what should happen, which agents, and optionally when (e.g. every Monday).
              Preview first, then save. Advanced editing uses the graph builder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={nlPrompt}
              onChange={(e) => setNlPrompt(e.target.value)}
              placeholder='Example: Every Monday at 9am, research my industry news with the Research agent, then draft a LinkedIn post with the Content agent.'
              rows={4}
              className="resize-y min-h-[100px]"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={nlLoading || !nlPrompt.trim()}
                onClick={() => void handleNlPreview()}
              >
                {nlLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Preview
              </Button>
              <Button
                type="button"
                disabled={nlLoading || !nlPrompt.trim()}
                onClick={() => void handleNlSave()}
              >
                Save workflow
              </Button>
            </div>
            {nlPreview && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{nlPreview.plan.name}</p>
                <p className="text-muted-foreground">{nlPreview.plan.description}</p>
                <ol className="mt-2 list-decimal pl-5 space-y-1">
                  {nlPreview.plan.steps.map((s, i) => (
                    <li key={i}>
                      <span className="font-mono text-xs text-primary">{s.agentId}</span> — {s.label}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!workflows && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {workflows && workflows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranch className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-base font-medium">No workflows yet</p>
            <p className="mb-6 text-muted-foreground">
              Create your first workflow to automate tasks with agents and human-in-the-loop steps.
            </p>
            <Button asChild>
              <Link href="/dashboard/workflows/builder">
                <Plus className="mr-2 h-4 w-4" />
                Create Workflow
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {workflows && workflows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <WorkflowCard
              key={wf._id}
              wf={wf}
              runLoadingId={runLoadingId}
              deletingId={deletingId}
              onRun={handleRun}
              onDelete={handleDelete}
              onResumeSuspended={handleResumeSuspended}
            />
          ))}
        </div>
      )}

      {resumeDialog && (
        <WorkflowRunResumeDialog
          open={!!resumeDialog}
          onOpenChange={(open) => !open && setResumeDialog(null)}
          runId={resumeDialog.runId}
          stepId={resumeDialog.stepId}
          suspendPayload={resumeDialog.suspendPayload}
          onSuccess={() => setResumeDialog(null)}
        />
      )}
    </div>
  )
}
