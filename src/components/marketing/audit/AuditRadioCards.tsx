'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Option = { value: string; label: string }

export function AuditRadioCards({
  name,
  value,
  onValueChange,
  options,
  className,
}: {
  name: string
  value: string
  onValueChange: (v: string) => void
  options: readonly Option[]
  className?: string
}) {
  return (
    <RadioGroup
      name={name}
      value={value}
      onValueChange={onValueChange}
      className={cn('grid gap-2', className)}
    >
      {options.map((opt) => {
        const selected = value === opt.value
        const id = `${name}-${opt.value}`
        return (
          <Label
            key={opt.value}
            htmlFor={id}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-normal transition-colors',
              selected
                ? 'border-brand-400 bg-brand-50 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-brand-200'
            )}
          >
            <RadioGroupItem
              value={opt.value}
              id={id}
              className="mt-0.5 border-border text-brand-600"
            />
            <span className="leading-snug">{opt.label}</span>
          </Label>
        )
      })}
    </RadioGroup>
  )
}
