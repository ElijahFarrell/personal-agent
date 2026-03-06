'use client'

import { useMemo } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { AGENT_REGISTRY } from '@/constants/agents'
import { cn } from '@/lib/utils'

export interface AgentMentionPopoverProps {
  query: string
  onSelect: (agentId: string, displayName: string) => void
  className?: string
}

export function AgentMentionPopover({
  query,
  onSelect,
  className,
}: AgentMentionPopoverProps) {
  const filteredAgents = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return AGENT_REGISTRY
    return AGENT_REGISTRY.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    )
  }, [query])

  return (
    <Command
      className={cn('border-0 bg-transparent p-0', className)}
      shouldFilter={false}
    >
      <CommandList className="max-h-[240px]">
        <CommandEmpty>No agent found</CommandEmpty>
        <CommandGroup heading="Mention an agent">
          {filteredAgents.map((agent) => {
            const Icon = agent.icon
            return (
              <CommandItem
                key={agent.id}
                value={agent.id}
                onSelect={() => onSelect(agent.id, agent.displayName)}
                className="gap-2 rounded-lg px-3 py-2 cursor-pointer"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    agent.iconBg,
                    agent.iconColor
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-medium">{agent.displayName}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {agent.description}
                  </span>
                </div>
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
