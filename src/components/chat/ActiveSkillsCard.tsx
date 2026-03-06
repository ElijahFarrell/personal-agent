'use client'

import { useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Pin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveSkillsCardProps {
  skills: Array<{ id: string; name: string; score: number }>
  pinnedIds?: Set<string>
  className?: string
}

export function ActiveSkillsCard({
  skills,
  pinnedIds = new Set(),
  className,
}: ActiveSkillsCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (skills.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger
        className={cn(
          'flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
          isOpen && 'bg-muted/60 text-foreground'
        )}
      >
        <span>
          {skills.length} skill{skills.length === 1 ? '' : 's'} loaded
        </span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          {skills.map((skill) => {
            const isPinned = pinnedIds.has(skill.id)
            const isHighRelevance = skill.score >= 0.3
            return (
              <li
                key={skill.id}
                className="flex items-center gap-2 text-xs text-foreground"
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    isPinned
                      ? 'bg-amber-500'
                      : isHighRelevance
                        ? 'bg-green-500/80'
                        : 'bg-muted-foreground/50'
                  )}
                  aria-hidden
                />
                {isPinned && (
                  <Pin className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
                )}
                <span className="truncate">{skill.name}</span>
              </li>
            )
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
