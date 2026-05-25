'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AuditFormData } from '@/types/audit-form'
import { WEEKLY_MANUAL_HOURS_OPTIONS } from '@/lib/audit/options'
import { AuditRadioCards } from './AuditRadioCards'

const inputClass =
  'min-h-[120px] border-white/10 bg-white/5 focus-visible:ring-brand-500/50'

export function StageDailyOps({
  data,
  onChange,
}: {
  data: AuditFormData
  onChange: (p: Partial<AuditFormData>) => void
}) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
          Walk us through a typical day
        </h2>
        <p className="text-sm text-muted-foreground">
          The gold is in the details. The more specific you are, the more
          actionable your audit will be.
        </p>
      </header>
      <div className="space-y-2">
        <Label htmlFor="top-tasks">
          What are the 3 tasks you spend the MOST time on every day?
        </Label>
        <Textarea
          id="top-tasks"
          placeholder="e.g., Following up with leads, updating my CRM, sending listing emails..."
          value={data.topTasks}
          onChange={(e) => onChange({ topTasks: e.target.value })}
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          Be specific — &quot;admin work&quot; is too vague. What admin work
          exactly?
        </p>
      </div>
      <div className="space-y-3">
        <Label>
          How many hours per week do you spend on tasks that feel repetitive or
          manual?
        </Label>
        <AuditRadioCards
          name="weeklyManualHours"
          value={data.weeklyManualHours}
          onValueChange={(weeklyManualHours) => onChange({ weeklyManualHours })}
          options={WEEKLY_MANUAL_HOURS_OPTIONS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="handoff">
          What&apos;s the ONE task you wish you could hand off to someone (or
          something) tomorrow?
        </Label>
        <Textarea
          id="handoff"
          placeholder="The thing that drains your energy the most..."
          value={data.oneTaskToHandOff}
          onChange={(e) => onChange({ oneTaskToHandOff: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  )
}
