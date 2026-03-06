'use client'

import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState, type RefObject } from 'react'
import { usePromptInputController } from '@/components/ai-elements/prompt-input'
import { AGENT_REGISTRY } from '@/constants/agents'
import type { AgentId } from '@/constants/agents'
import { cn } from '@/lib/utils'

const AT_PATTERN = /@(\w*)$/

interface AgentMentionPopoverProps {
  onSelect: (agentId: AgentId) => void
  anchorRef: RefObject<HTMLDivElement | null>
}

export function AgentMentionPopover({ onSelect, anchorRef }: AgentMentionPopoverProps) {
  const controller = usePromptInputController()
  const value = controller.textInput.value
  const setInput = controller.textInput.setInput

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [positionTick, setPositionTick] = useState(0)

  const match = useMemo(() => value.match(AT_PATTERN), [value])
  const query = match?.[1] ?? ''
  const showPopover = match !== null

  const filteredAgents = useMemo(() => {
    if (!query) return AGENT_REGISTRY
    const q = query.toLowerCase()
    return AGENT_REGISTRY.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    )
  }, [query])

  useEffect(() => {
    if (!showPopover) return
    setSelectedIndex(0)
  }, [showPopover, query])

  useEffect(() => {
    if (!showPopover || filteredAgents.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((i) => Math.min(i + 1, filteredAgents.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filteredAgents[selectedIndex]) {
        e.preventDefault()
        e.stopPropagation()
        const agent = filteredAgents[selectedIndex]
        setInput(value.replace(AT_PATTERN, '').trimStart())
        onSelect(agent.id)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setInput(value.replace(AT_PATTERN, ''))
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [showPopover, filteredAgents, selectedIndex, value, setInput, onSelect])

  useEffect(() => {
    if (!showPopover || typeof document === 'undefined') return

    const updatePosition = () => setPositionTick((t) => t + 1)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    document.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
      document.removeEventListener('scroll', updatePosition, true)
    }
  }, [showPopover])

  if (!showPopover || typeof document === 'undefined') return null

  const rect = anchorRef.current?.getBoundingClientRect()
  const style: React.CSSProperties = rect
    ? {
        position: 'fixed',
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
        width: rect.width,
        maxHeight: 192,
        zIndex: 9999,
      }
    : { display: 'none' }

  const popoverContent = (
    <div
      className="max-h-48 overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg"
      role="listbox"
      style={style}
    >
      {filteredAgents.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          No agents match
        </div>
      ) : (
        <ul className="space-y-0.5">
          {filteredAgents.map((agent, i) => {
            const Icon = agent.icon
            return (
              <li key={agent.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === selectedIndex}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                    i === selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  )}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => {
                    setInput(value.replace(AT_PATTERN, '').trimStart())
                    onSelect(agent.id)
                  }}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded',
                      agent.iconBg,
                      agent.iconColor
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate font-medium">{agent.displayName}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  return createPortal(popoverContent, document.body)
}
