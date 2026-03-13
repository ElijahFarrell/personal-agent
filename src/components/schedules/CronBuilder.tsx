'use client'

import { useEffect, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { validateAndComputeNextRun } from '@/services/scheduleService'

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: 'Every morning at 9am', value: '0 9 * * *' },
  { label: 'Every Monday at 9am', value: '0 9 * * 1' },
  { label: 'Every weekday at 9am', value: '0 9 * * 1-5' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every Sunday at 10am', value: '0 10 * * 0' },
]

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

interface CronBuilderProps {
  cronExpression: string
  timezone: string
  onCronChange: (value: string) => void
  onTimezoneChange: (value: string) => void
  onValidationChange?: (valid: boolean, nextRunAt?: number, error?: string) => void
}

export function CronBuilder({
  cronExpression,
  timezone,
  onCronChange,
  onTimezoneChange,
  onValidationChange,
}: CronBuilderProps) {
  const validation = useMemo(() => {
    return validateAndComputeNextRun(cronExpression, timezone)
  }, [cronExpression, timezone])

  useEffect(() => {
    onValidationChange?.(validation.valid, validation.nextRunAt, validation.error)
  }, [validation, onValidationChange])

  const isPreset = CRON_PRESETS.some((p) => p.value === cronExpression)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Schedule</Label>
        <Select
          value={isPreset ? cronExpression : '__custom__'}
          onValueChange={(v) => {
            if (v !== '__custom__') onCronChange(v)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select preset" />
          </SelectTrigger>
          <SelectContent>
            {CRON_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="__custom__">Custom expression</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(!isPreset || cronExpression === '__custom__') && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">Cron expression</Label>
          <Input
            value={cronExpression}
            onChange={(e) => onCronChange(e.target.value)}
            placeholder="0 9 * * *"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Format: minute hour day-of-month month day-of-week (e.g. 0 9 * * * = 9am daily)
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={onTimezoneChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {validation.valid && validation.nextRunAt && (
        <p className="text-sm text-muted-foreground">
          Next run: {new Date(validation.nextRunAt).toLocaleString()}
        </p>
      )}
      {!validation.valid && validation.error && (
        <p className="text-sm text-destructive">{validation.error}</p>
      )}
    </div>
  )
}
