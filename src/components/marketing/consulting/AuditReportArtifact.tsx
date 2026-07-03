'use client'

import * as React from 'react'

const rows = [
  {
    label: 'Grant drafting workflow',
    priority: 'High',
    savings: '11 hrs/week',
    delay: 'animate-fade-up-delay-1',
  },
  {
    label: 'CRM lead follow-up',
    priority: 'Medium',
    savings: '6 hrs/week',
    delay: 'animate-fade-up-delay-2',
  },
  {
    label: 'Document Q&A for team',
    priority: 'Medium',
    savings: '4 hrs/week',
    delay: 'animate-fade-up-delay-3',
  },
] as const

export function AuditReportArtifact() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      className="marketing-card relative overflow-hidden rounded-2xl p-6 sm:p-8"
      aria-label="Preview of a personalized AI audit report"
    >
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="font-mono-accent text-muted-foreground">AI Audit Report</p>
          <p className="font-display mt-1 text-xl text-foreground sm:text-2xl">
            Sample Co.
          </p>
        </div>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
          Draft
        </span>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-secondary/60 px-3 py-3">
          <p className="font-display text-2xl text-foreground">3</p>
          <p className="mt-1 text-xs text-muted-foreground">Opportunities</p>
        </div>
        <div className="rounded-lg bg-secondary/60 px-3 py-3">
          <p className="font-display text-2xl text-foreground">11</p>
          <p className="mt-1 text-xs text-muted-foreground">Hrs/week saved</p>
        </div>
        <div className="rounded-lg bg-secondary/60 px-3 py-3">
          <p className="font-display text-2xl text-brand-600">#1</p>
          <p className="mt-1 text-xs text-muted-foreground">Priority</p>
        </div>
      </div>

      <p className="font-mono-accent mb-3 text-muted-foreground">
        Top automation opportunities
      </p>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className={`flex items-center justify-between gap-3 rounded-lg border border-border bg-background/80 px-3 py-2.5 ${
              mounted ? row.delay : 'animate-fade-up'
            }`}
          >
            <span className="text-sm text-foreground">{row.label}</span>
            <div className="flex shrink-0 items-center gap-2 text-xs">
              <span className="text-[hsl(var(--success))]">{row.savings}</span>
              <span className="rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">
                {row.priority}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-muted-foreground">
        Illustrative preview — your report is personalized to your business.
      </p>
    </div>
  )
}
