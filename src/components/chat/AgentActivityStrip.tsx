'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CloudOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const FALLBACK_STEPS = [
  'Preparing context and connections…',
  'Connecting tools…',
  'Synthesizing the reply…',
] as const

const CYCLE_MS = 2500

export type AgentActivityStripProps = {
  /** When false, nothing is rendered. */
  visible: boolean
  phase: string | null
  milestone: string | null
  isStreaming: boolean
  isSubmitted: boolean
  activeToolLabels: string[]
  backgroundJob?: boolean
  /** Thin layout attached to composer; smaller type and progress bar. */
  variant?: 'default' | 'dock'
  /** When false, only phase/milestone cycling + progress (tool names live in message trace). */
  showToolBadges?: boolean
}

function buildCycleCandidates(
  phase: string | null,
  milestone: string | null,
  isSubmitted: boolean,
  isStreaming: boolean
): string[] {
  const primary: string[] = []
  if (phase?.trim()) primary.push(phase.trim())
  if (milestone?.trim() && milestone.trim() !== phase?.trim()) {
    primary.push(milestone.trim())
  }
  if (primary.length > 0) return primary
  if (isSubmitted && !isStreaming) return [FALLBACK_STEPS[0]]
  if (isStreaming) return [...FALLBACK_STEPS]
  return [FALLBACK_STEPS[0]]
}

export function AgentActivityStrip({
  visible,
  phase,
  milestone,
  isStreaming,
  isSubmitted,
  activeToolLabels,
  backgroundJob,
  variant = 'default',
  showToolBadges = false,
}: AgentActivityStripProps) {
  const reduceMotion = useReducedMotion()
  const candidates = useMemo(
    () => buildCycleCandidates(phase, milestone, isSubmitted, isStreaming),
    [phase, milestone, isSubmitted, isStreaming]
  )

  const [cycleIndex, setCycleIndex] = useState(0)

  useEffect(() => {
    if (!visible || reduceMotion || candidates.length <= 1) return
    const t = setInterval(() => {
      setCycleIndex((i) => (i + 1) % candidates.length)
    }, CYCLE_MS)
    return () => clearInterval(t)
  }, [visible, reduceMotion, candidates.length])

  useEffect(() => {
    setCycleIndex(0)
  }, [candidates])

  const displayLabel = reduceMotion
    ? candidates[0] ?? FALLBACK_STEPS[0]
    : candidates[cycleIndex] ?? candidates[0] ?? FALLBACK_STEPS[0]

  if (!visible) return null

  const dock = variant === 'dock'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'relative w-full overflow-hidden rounded-xl border border-transparent bg-gradient-to-r from-primary/10 via-transparent to-transparent',
        'shadow-sm ring-1 ring-primary/15 ring-inset',
        dock ? 'rounded-2xl p-2' : 'rounded-xl p-3'
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/5" />

      <div className={cn('relative flex flex-col', dock ? 'gap-2' : 'gap-3')}>
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-full bg-primary/20',
            dock ? 'h-1' : 'h-2'
          )}
        >
          {!reduceMotion ? (
            <div
              className="absolute inset-y-0 w-[38%] rounded-full bg-primary agent-progress-indeterminate"
              aria-hidden
            />
          ) : (
            <div
              className="h-full w-1/3 rounded-full bg-primary/70"
              aria-hidden
            />
          )}
        </div>

        <div
          className={cn(
            'min-h-[1.25rem] text-muted-foreground',
            dock ? 'text-xs' : 'text-sm'
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={displayLabel}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="block"
            >
              {displayLabel}
            </motion.span>
          </AnimatePresence>
        </div>

        {showToolBadges && activeToolLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Active tools">
            {activeToolLabels.map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="rounded-full text-xs font-normal"
              >
                {label}
              </Badge>
            ))}
          </div>
        )}

        {backgroundJob && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Working in the background — you can leave this page. The reply will
              appear when it&apos;s ready.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
