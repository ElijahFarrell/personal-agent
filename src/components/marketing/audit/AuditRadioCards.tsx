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
                ? 'border-brand-500/50 bg-brand-500/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20'
            )}
          >
            <RadioGroupItem
              value={opt.value}
              id={id}
              className="mt-0.5 border-white/20 text-brand-500"
            />
            <span className="leading-snug">{opt.label}</span>
          </Label>
        )
      })}
    </RadioGroup>
  )
}
