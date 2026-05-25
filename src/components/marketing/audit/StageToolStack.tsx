'use client'

import type { KeyboardEvent } from 'react'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AuditFormData } from '@/types/audit-form'
import { TOOL_OPTIONS } from '@/lib/audit/options'
import { cn } from '@/lib/utils'

const inputClass =
  'min-h-[100px] border-white/10 bg-white/5 focus-visible:ring-brand-500/50'

export function StageToolStack({
  data,
  onChange,
}: {
  data: AuditFormData
  onChange: (p: Partial<AuditFormData>) => void
}) {
  function toggleTool(value: string) {
    const set = new Set(data.currentTools)
    if (set.has(value)) set.delete(value)
    else set.add(value)
    onChange({ currentTools: [...set] })
  }

  function toolKeyToggle(e: KeyboardEvent, value: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleTool(value)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
          What tools are you currently using?
        </h2>
        <p className="text-sm text-muted-foreground">
          We need to know what you&apos;re working with so we can show you
          what&apos;s possible — and what&apos;s redundant.
        </p>
      </header>
      <div className="space-y-3">
        <Label>Which of these tools do you currently use?</Label>
        <p className="text-xs text-muted-foreground">Select all that apply.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TOOL_OPTIONS.map((opt) => {
            const checked = data.currentTools.includes(opt.value)
            return (
              <div
                key={opt.value}
                role="checkbox"
                aria-checked={checked}
                tabIndex={0}
                onClick={() => toggleTool(opt.value)}
                onKeyDown={(e) => toolKeyToggle(e, opt.value)}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
                  checked
                    ? 'border-brand-400 bg-brand-50 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-brand-200'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
                    checked
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-border bg-transparent'
                  )}
                  aria-hidden
                >
                  {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
                <span className="leading-snug">{opt.label}</span>
              </div>
            )
          })}
        </div>
        {data.currentTools.includes('other') ? (
          <Input
            placeholder="Describe other tools"
            value={data.toolsOther}
            onChange={(e) => onChange({ toolsOther: e.target.value })}
            className="border-white/10 bg-white/5"
          />
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="tool-frustration">
          What&apos;s your biggest frustration with your current tools?
        </Label>
        <Textarea
          id="tool-frustration"
          placeholder="e.g., Nothing talks to each other, I'm entering the same info in 3 places..."
          value={data.toolFrustration}
          onChange={(e) => onChange({ toolFrustration: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="off-tool">
          Are there important processes you handle OUTSIDE your main tools?
        </Label>
        <Textarea
          id="off-tool"
          placeholder="The stuff that lives in your head or in random places..."
          value={data.offToolProcesses}
          onChange={(e) => onChange({ offToolProcesses: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  )
}
