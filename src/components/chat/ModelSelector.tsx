'use client'

import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SELECTABLE_MODELS } from '@/constants/models'
import { cn } from '@/lib/utils'

const COMPANY_LABELS: Record<string, string> = {
  auto: 'AUTO',
  anthropic: 'ANTHROPIC',
  google: 'GOOGLE',
  openai: 'OPENAI',
  xai: 'XAI',
}

const companies = ['auto', 'anthropic', 'google', 'openai', 'xai'] as const

interface ModelSelectorProps {
  value: string
  onChange: (id: string) => void
  className?: string
}

export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  const selected = SELECTABLE_MODELS.find((m) => m.id === value)
  const displayLabel = selected?.label ?? 'Auto'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 gap-1 px-2 text-xs font-normal text-muted-foreground hover:text-foreground',
            className
          )}
          aria-label="Select model"
        >
          {displayLabel}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        {companies.map((company) => {
          const models = SELECTABLE_MODELS.filter((m) => m.company === company)
          if (models.length === 0) return null
          return (
            <div key={company}>
              {company !== 'auto' && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {COMPANY_LABELS[company]}
              </DropdownMenuLabel>
              {models.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => onChange(model.id)}
                  className="cursor-pointer"
                >
                  {value === model.id ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <span className="mr-2 w-4" />
                  )}
                  {model.label}
                </DropdownMenuItem>
              ))}
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
