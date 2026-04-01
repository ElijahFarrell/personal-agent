'use client'

import * as React from 'react'
import { metricsBar } from '@/lib/marketing/copy'

function MetricsMarquee() {
  /**
   * One flex row, two copies, `gap-8` between every item (including the seam).
   * Keyframes use `calc(-50% - 1rem)` because total width is 2U + gap, not 2U.
   */
  return (
    <div
      className="flex w-max shrink-0 animate-marquee gap-8 motion-reduce:animate-none will-change-transform"
      aria-hidden
    >
      {[0, 1].map((dup) =>
        metricsBar.map((row) => (
          <span
            key={`${dup}-${row.label}`}
            className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap text-xs sm:text-sm"
          >
            <span className="font-medium uppercase tracking-wide text-muted-foreground">
              {row.label}
            </span>
            <span className="text-[10px] text-white/25 sm:text-xs" aria-hidden>
              ·
            </span>
            <span className="font-display font-semibold tabular-nums text-white">
              {row.value}
            </span>
          </span>
        ))
      )}
    </div>
  )
}

function MetricsStatic() {
  return (
    <div className="flex justify-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex shrink-0 items-center gap-6 whitespace-nowrap text-xs sm:text-sm">
        {metricsBar.map((row) => (
          <span
            key={row.label}
            className="inline-flex items-baseline gap-1.5"
          >
            <span className="font-medium uppercase tracking-wide text-muted-foreground">
              {row.label}
            </span>
            <span className="text-[10px] text-white/25 sm:text-xs" aria-hidden>
              ·
            </span>
            <span className="font-display font-semibold tabular-nums text-white">
              {row.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function MetricsBar() {
  const [reducedMotion, setReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const summary = metricsBar.map((r) => `${r.label}: ${r.value}`).join('; ')

  return (
    <section
      className="relative border-y border-white/[0.06] bg-white/[0.02] py-2 sm:py-2.5"
      aria-labelledby="metrics-heading"
    >
      <h2 id="metrics-heading" className="sr-only">
        Trust and results at a glance
      </h2>
      <p className="sr-only">{summary}</p>
      <div className="mx-auto max-w-6xl overflow-hidden px-4 sm:px-6">
        {reducedMotion ? (
          <MetricsStatic />
        ) : (
          <MetricsMarquee />
        )}
      </div>
    </section>
  )
}
