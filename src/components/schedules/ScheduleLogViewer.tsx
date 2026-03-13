'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SCHEDULE_LOG_STATUS } from '@convex/constants'

const STATUS_ICONS: Record<string, React.ElementType> = {
  [SCHEDULE_LOG_STATUS.RUNNING]: Loader2,
  [SCHEDULE_LOG_STATUS.SUCCESS]: CheckCircle2,
  [SCHEDULE_LOG_STATUS.FAILED]: XCircle,
  [SCHEDULE_LOG_STATUS.SUSPENDED]: UserCheck,
}

const STATUS_NAMES: Record<string, string> = {
  [SCHEDULE_LOG_STATUS.RUNNING]: 'Running',
  [SCHEDULE_LOG_STATUS.SUCCESS]: 'Success',
  [SCHEDULE_LOG_STATUS.FAILED]: 'Failed',
  [SCHEDULE_LOG_STATUS.SUSPENDED]: 'Suspended',
}

interface ScheduleLogViewerProps {
  scheduleId: Id<'schedules'>
  limit?: number
  onResumeSuspended?: (runId: Id<'workflowRuns'>) => void
}

export function ScheduleLogViewer({ scheduleId, limit = 10, onResumeSuspended }: ScheduleLogViewerProps) {
  const [expanded, setExpanded] = useState(false)
  const logs = useQuery(api.schedules.getLogsByScheduleId, {
    scheduleId,
    limit,
  })

  if (!logs || logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No logs yet</p>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {logs.length} run{logs.length !== 1 ? 's' : ''}
      </button>
      {expanded && (
        <ul className="space-y-2">
          {logs.map((log) => {
            const Icon = STATUS_ICONS[log.status] ?? Clock
            const statusName = STATUS_NAMES[log.status] ?? log.status
            return (
              <li
                key={log._id}
                className={cn(
                  'flex items-start gap-2 rounded-lg border p-3 text-sm',
                  log.status === SCHEDULE_LOG_STATUS.FAILED && 'border-destructive/30'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 mt-0.5',
                    log.status === SCHEDULE_LOG_STATUS.RUNNING && 'animate-spin',
                    log.status === SCHEDULE_LOG_STATUS.SUCCESS && 'text-green-600',
                    log.status === SCHEDULE_LOG_STATUS.FAILED && 'text-destructive'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{statusName}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(log.startedAt).toLocaleString()}
                    </span>
                  </div>
                  {log.completedAt && (
                    <span className="text-xs text-muted-foreground">
                      Duration: {log.completedAt - log.startedAt}ms
                    </span>
                  )}
                  {log.error && (
                    <p className="mt-1 text-destructive text-xs">{log.error}</p>
                  )}
                  {log.status === SCHEDULE_LOG_STATUS.SUSPENDED &&
                    log.runId &&
                    onResumeSuspended && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() =>
                          onResumeSuspended(log.runId as Id<'workflowRuns'>)
                        }
                      >
                        <UserCheck className="mr-1 h-3 w-3" />
                        Review & Approve
                      </Button>
                    )}
                  {log.result && typeof log.result === 'object' && (
                    <pre className="mt-1 text-xs text-muted-foreground overflow-auto max-h-24">
                      {JSON.stringify(log.result, null, 2)}
                    </pre>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
