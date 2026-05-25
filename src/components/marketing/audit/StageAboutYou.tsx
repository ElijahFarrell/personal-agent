'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AuditFormData } from '@/types/audit-form'
import {
  INDUSTRY_OPTIONS,
  ROLE_OPTIONS,
  TEAM_SIZE_OPTIONS,
} from '@/lib/audit/options'
import { AuditRadioCards } from './AuditRadioCards'

export function StageAboutYou({
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
          First, tell us about your business
        </h2>
        <p className="text-sm text-muted-foreground">
          We need to understand your world before we can find the opportunities
          hiding in it.
        </p>
      </header>
      <div className="space-y-2">
        <Label htmlFor="audit-name">What&apos;s your name?</Label>
        <Input
          id="audit-name"
          autoComplete="given-name"
          placeholder="First name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="border-white/10 bg-white/5 focus-visible:ring-brand-500/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audit-email">What&apos;s your email?</Label>
        <Input
          id="audit-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className="border-white/10 bg-white/5 focus-visible:ring-brand-500/50"
        />
        <p className="text-xs text-muted-foreground">
          This is where we deliver your report.
        </p>
      </div>
      <div className="space-y-3">
        <Label>What&apos;s your role?</Label>
        <AuditRadioCards
          name="role"
          value={data.role}
          onValueChange={(role) => onChange({ role })}
          options={ROLE_OPTIONS}
        />
        {data.role === 'other' ? (
          <Input
            placeholder="Describe your role"
            value={data.roleOther}
            onChange={(e) => onChange({ roleOther: e.target.value })}
            className="border-white/10 bg-white/5"
          />
        ) : null}
      </div>
      <div className="space-y-3">
        <Label>How large is your team?</Label>
        <AuditRadioCards
          name="teamSize"
          value={data.teamSize}
          onValueChange={(teamSize) => onChange({ teamSize })}
          options={TEAM_SIZE_OPTIONS}
        />
      </div>
      <div className="space-y-3">
        <Label>What industry are you in?</Label>
        <p className="text-xs text-muted-foreground">
          We use this to ground your report in research about your specific
          industry — typical workflows, tools, and AI use cases.
        </p>
        <AuditRadioCards
          name="industry"
          value={data.industry}
          onValueChange={(industry) => onChange({ industry })}
          options={INDUSTRY_OPTIONS}
        />
        {data.industry === 'other' ? (
          <Input
            placeholder="Describe your industry (e.g. veterinary clinics, dental practice, B2B logistics)"
            value={data.industryOther}
            onChange={(e) => onChange({ industryOther: e.target.value })}
            className="border-white/10 bg-white/5"
          />
        ) : null}
      </div>
    </div>
  )
}
