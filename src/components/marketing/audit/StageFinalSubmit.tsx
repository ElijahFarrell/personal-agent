'use client'

import { Label } from '@/components/ui/label'
import type { AuditFormData } from '@/types/audit-form'
import { ANNUAL_REVENUE_OPTIONS, MONTHLY_LEADS_OPTIONS } from '@/lib/audit/options'
import { AuditRadioCards } from './AuditRadioCards'

export function StageFinalSubmit({
  data,
  onChange,
}: {
  data: AuditFormData
  onChange: (p: Partial<AuditFormData>) => void
}) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
          Last step — let&apos;s make this actionable
        </h2>
        <p className="text-sm text-muted-foreground">
          A couple more details so your audit report is specific to YOUR
          numbers, not generic advice.
        </p>
      </header>
      <div className="space-y-3">
        <Label>Roughly how many new leads do you get per month?</Label>
        <AuditRadioCards
          name="monthlyLeads"
          value={data.monthlyLeads}
          onValueChange={(monthlyLeads) => onChange({ monthlyLeads })}
          options={MONTHLY_LEADS_OPTIONS}
        />
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <Label>What&apos;s your approximate annual revenue?</Label>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>
        <AuditRadioCards
          name="annualRevenue"
          value={data.annualRevenue}
          onValueChange={(annualRevenue) => onChange({ annualRevenue })}
          options={ANNUAL_REVENUE_OPTIONS}
        />
      </div>
    </div>
  )
}
