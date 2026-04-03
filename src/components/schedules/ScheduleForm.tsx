'use client'

import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CronBuilder } from './CronBuilder'
import { SCHEDULE_ACTION_TYPE } from '@convex/constants'
import { HelpCircle } from 'lucide-react'

interface ScheduleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editSchedule?: {
    _id: Id<'schedules'>
    name: string
    description?: string
    cronExpression: string
    timezone: string
    action: {
      type: 'workflow' | 'agent_prompt'
      workflowId?: Id<'workflowDefinitions'>
      agentPrompt?: string
      inputData?: Record<string, unknown>
    }
    isEnabled: boolean
    autoApprove: boolean
  }
}

export function ScheduleForm({
  open,
  onOpenChange,
  onSuccess,
  editSchedule,
}: ScheduleFormProps) {
  const { user } = useUser()
  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )
  const workflows = useQuery(
    api.workflowDefinitions.listByTenantId,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cronExpression, setCronExpression] = useState('0 9 * * *')
  const [timezone, setTimezone] = useState('America/New_York')
  const [actionType, setActionType] = useState<'workflow' | 'agent_prompt'>(
    SCHEDULE_ACTION_TYPE.AGENT_PROMPT
  )
  const [workflowId, setWorkflowId] = useState<Id<'workflowDefinitions'> | ''>('')
  const [agentPrompt, setAgentPrompt] = useState('')
  const [autoApprove, setAutoApprove] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editSchedule) {
      setName(editSchedule.name)
      setDescription(editSchedule.description ?? '')
      setCronExpression(editSchedule.cronExpression)
      setTimezone(editSchedule.timezone)
      setActionType(editSchedule.action.type)
      setWorkflowId(editSchedule.action.workflowId ?? '')
      setAgentPrompt(editSchedule.action.agentPrompt ?? '')
      setAutoApprove(editSchedule.autoApprove)
    } else {
      setName('')
      setDescription('')
      setCronExpression('0 9 * * *')
      setTimezone('America/New_York')
      setActionType(SCHEDULE_ACTION_TYPE.AGENT_PROMPT)
      setWorkflowId('')
      setAgentPrompt('')
      setAutoApprove(false)
    }
  }, [editSchedule, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const action =
        actionType === SCHEDULE_ACTION_TYPE.WORKFLOW
          ? { type: 'workflow' as const, workflowId: workflowId || undefined }
          : { type: 'agent_prompt' as const, agentPrompt: agentPrompt.trim() }

      if (actionType === SCHEDULE_ACTION_TYPE.AGENT_PROMPT && !action.agentPrompt) {
        setError('Please enter a prompt for the agent')
        return
      }
      if (
        actionType === SCHEDULE_ACTION_TYPE.WORKFLOW &&
        (!workflowId || workflowId === '__none__')
      ) {
        setError('Please select a workflow')
        return
      }

      const url = editSchedule
        ? `/api/schedules/${editSchedule._id}`
        : '/api/schedules'
      const method = editSchedule ? 'PUT' : 'POST'
      const body = editSchedule
        ? {
            name: name.trim(),
            description: description.trim() || undefined,
            cronExpression,
            timezone,
            action,
            autoApprove,
          }
        : {
            name: name.trim(),
            description: description.trim() || undefined,
            cronExpression,
            timezone,
            action,
            isEnabled: true,
            autoApprove,
          }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to save schedule')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editSchedule ? 'Edit Schedule' : 'New Schedule'}</DialogTitle>
          <DialogDescription>
            Create a recurring task that runs on a schedule. Choose either an agent
            prompt or a saved workflow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning insights"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this schedule do?"
              rows={2}
            />
          </div>

          <CronBuilder
            cronExpression={cronExpression}
            timezone={timezone}
            onCronChange={setCronExpression}
            onTimezoneChange={setTimezone}
          />

          <div className="space-y-4">
            <Label>Action</Label>
            <Select
              value={actionType}
              onValueChange={(v) =>
                setActionType(v as 'workflow' | 'agent_prompt')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SCHEDULE_ACTION_TYPE.AGENT_PROMPT}>
                  Agent prompt (free text)
                </SelectItem>
                <SelectItem value={SCHEDULE_ACTION_TYPE.WORKFLOW}>
                  Run saved workflow
                </SelectItem>
              </SelectContent>
            </Select>

            {actionType === SCHEDULE_ACTION_TYPE.AGENT_PROMPT && (
              <div className="space-y-2">
                <Label htmlFor="agentPrompt">Prompt</Label>
                <Textarea
                  id="agentPrompt"
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="e.g. Check my channels, pull revenue, and give me a brief summary"
                  rows={3}
                />
              </div>
            )}

            {actionType === SCHEDULE_ACTION_TYPE.WORKFLOW && (
              <div className="space-y-2">
                <Label>Workflow</Label>
                {workflows && workflows.length > 0 ? (
                  <Select
                    value={workflowId || '__none__'}
                    onValueChange={(v) =>
                      v !== '__none__' && setWorkflowId(v as Id<'workflowDefinitions'>)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select workflow…</SelectItem>
                      {workflows.map((wf) => (
                        <SelectItem key={wf._id} value={wf._id}>
                          {wf.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Create a workflow first in the Workflows section.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="autoApprove">Auto-approve human steps</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      When enabled, any human-in-the-loop approval steps will be
                      automatically approved. Disable to review and approve manually.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Skip manual approval for suspend steps
              </p>
            </div>
            <Switch
              id="autoApprove"
              checked={autoApprove}
              onCheckedChange={setAutoApprove}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editSchedule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
