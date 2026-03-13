'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScheduleForm } from './ScheduleForm'
import { ScheduleLogViewer } from './ScheduleLogViewer'
import { WorkflowRunResumeDialog } from '@/components/workflows/WorkflowRunResumeDialog'
import { SCHEDULE_ACTION_TYPE } from '@convex/constants'

export function ScheduleList() {
  const { user } = useUser()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<Id<'schedules'> | null>(null)
  const [deleteId, setDeleteId] = useState<Id<'schedules'> | null>(null)
  const [expandedId, setExpandedId] = useState<Id<'schedules'> | null>(null)
  const [togglingId, setTogglingId] = useState<Id<'schedules'> | null>(null)
  const [resumeDialog, setResumeDialog] = useState<{
    runId: Id<'workflowRuns'>
    stepId?: string
  } | null>(null)

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const schedules = useQuery(
    api.schedules.listByTenantId,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const handleToggle = async (scheduleId: Id<'schedules'>, isEnabled: boolean) => {
    setTogglingId(scheduleId)
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !isEnabled }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to toggle')
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to toggle')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/schedules/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Delete failed')
      }
      setDeleteId(null)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const openEdit = (schedule: (typeof schedules)[0]) => {
    setEditId(schedule._id)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditId(null)
  }

  const editSchedule = editId
    ? schedules?.find((s) => s._id === editId)
    : undefined

  return (
    <>
      <div className="space-y-4">
        {schedules?.map((schedule) => {
          const isExpanded = expandedId === schedule._id
          const actionLabel =
            schedule.action.type === SCHEDULE_ACTION_TYPE.WORKFLOW
              ? 'Workflow'
              : 'Agent prompt'

          return (
            <Card key={schedule._id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          schedule.isEnabled
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground'
                        }
                      >
                        {schedule.name}
                      </span>
                      {!schedule.isEnabled && (
                        <span className="text-xs text-muted-foreground">
                          (paused)
                        </span>
                      )}
                    </div>
                    {schedule.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {schedule.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{schedule.cronExpression}</span>
                      <span>{schedule.timezone}</span>
                      <span>{actionLabel}</span>
                      {schedule.nextRunAt && (
                        <span>
                          Next: {new Date(schedule.nextRunAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {togglingId === schedule._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Switch
                        checked={schedule.isEnabled}
                        onCheckedChange={() =>
                          handleToggle(schedule._id, schedule.isEnabled)
                        }
                      />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(schedule)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(schedule._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs">
                  {schedule.lastRunAt && (
                    <span className="text-muted-foreground">
                      Last run: {new Date(schedule.lastRunAt).toLocaleString()}
                      {schedule.lastRunStatus && ` (${schedule.lastRunStatus})`}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : schedule._id)
                    }
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Run history
                  </button>
                  {isExpanded && (
                    <div className="mt-2 pl-4 border-l">
                      <ScheduleLogViewer
                        scheduleId={schedule._id}
                        onResumeSuspended={(runId) =>
                          setResumeDialog({ runId })
                        }
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ScheduleForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditId(null)
        }}
        onSuccess={closeForm}
        editSchedule={
          editSchedule
            ? {
                _id: editSchedule._id,
                name: editSchedule.name,
                description: editSchedule.description,
                cronExpression: editSchedule.cronExpression,
                timezone: editSchedule.timezone,
                action: editSchedule.action,
                isEnabled: editSchedule.isEnabled,
                autoApprove: editSchedule.autoApprove,
              }
            : undefined
        }
      />

      {resumeDialog && (
        <WorkflowRunResumeDialog
          open={!!resumeDialog}
          onOpenChange={(open) => !open && setResumeDialog(null)}
          runId={resumeDialog.runId}
          stepId={resumeDialog.stepId}
          onSuccess={() => setResumeDialog(null)}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the schedule. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
