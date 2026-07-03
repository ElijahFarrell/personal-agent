import * as React from 'react'

type WorkflowDiagramProps = {
  before: readonly string[]
  after: readonly string[]
  className?: string
}

export function WorkflowDiagram({
  before,
  after,
  className = '',
}: WorkflowDiagramProps) {
  return (
    <div
      className={`marketing-card rounded-xl p-5 sm:p-6 ${className}`}
      aria-label="Before and after workflow comparison"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="font-mono-accent mb-3 text-muted-foreground">Before</p>
          <ol className="space-y-2">
            {before.map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-0.5 font-mono text-xs text-border">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="font-mono-accent mb-3 text-brand-600">After</p>
          <ol className="space-y-2">
            {after.map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <span className="mt-0.5 font-mono text-xs text-brand-400">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

type ArchitectureDiagramProps = {
  steps: readonly string[]
  className?: string
}

export function ArchitectureDiagram({
  steps,
  className = '',
}: ArchitectureDiagramProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      aria-label="System architecture flow"
    >
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <span className="rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 font-mono text-xs text-foreground">
            {step}
          </span>
          {i < steps.length - 1 ? (
            <span className="text-muted-foreground" aria-hidden>
              →
            </span>
          ) : null}
        </React.Fragment>
      ))}
    </div>
  )
}
