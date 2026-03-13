'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { WORKFLOW_STEP_STATUS } from '@convex/constants'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { UserCheck, Loader2 } from 'lucide-react'
import type { Id } from '@convex/_generated/dataModel'

interface WorkflowRunResumeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  runId: Id<'workflowRuns'>
  stepId?: string
  suspendPayload?: unknown
  onSuccess: () => void
}

export function WorkflowRunResumeDialog({
  open,
  onOpenChange,
  runId,
  stepId,
  suspendPayload: initialPayload,
  onSuccess,
}: WorkflowRunResumeDialogProps) {
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  const run = useQuery(api.workflowRuns.getById, open ? { runId } : 'skip')
  const steps = useQuery(api.workflowRuns.getStepsByRunId, open ? { runId } : 'skip')
  const suspendedStep = steps?.find(
    (s) =>
      s.stepId === (stepId ?? run?.suspendedAt) ||
      s.status === WORKFLOW_STEP_STATUS.SUSPENDED
  )
  const suspendPayload = initialPayload ?? suspendedStep?.suspendPayload

  const handleResume = async (approved: boolean) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workflows/runs/${runId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: stepId,
          resumeData: { approved, feedback: feedback.trim() || undefined },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Resume failed')
      onSuccess()
      onOpenChange(false)
      setFeedback('')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Resume failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Human Approval Required
          </DialogTitle>
          <DialogDescription>
            This workflow is waiting for your approval to continue. Review the
            details below and approve or reject.
          </DialogDescription>
        </DialogHeader>

        {suspendPayload && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <Label className="text-xs text-muted-foreground">Context</Label>
            <pre className="mt-1 text-sm overflow-auto max-h-32">
              {typeof suspendPayload === 'object'
                ? JSON.stringify(suspendPayload, null, 2)
                : String(suspendPayload)}
            </pre>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="feedback">Feedback (optional)</Label>
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add notes for the workflow..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleResume(false)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
          </Button>
          <Button onClick={() => handleResume(true)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
