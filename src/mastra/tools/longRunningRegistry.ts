/**
 * Registry of tool ids that routinely exceed the default Next.js serverless
 * timeout (60s-ish on Fluid Compute, 300s on upgraded plans). Useful for
 * workers, UI hints, or future routing — not used for silent auto-promote.
 *
 * Keep the registry small and explicit: each entry is an executable operation
 * that talks to a slow third-party service (Exa websets, large workflow
 * graphs) where our median wait is > 20s.
 *
 * `estDurationMs` is a best-effort budget, not a hard cap — the worker tier
 * still polls with its own timeout. Prefer p90 values, not maximums.
 */

export interface LongRunningToolMetadata {
  /** True when the tool routinely outlives a standard Vercel invocation. */
  longRunning: true
  /** Rough p90 duration budget (ms). */
  estDurationMs: number
  /** Short human-readable reason — surfaced in logs and UI. */
  reason?: string
}

export const LONG_RUNNING_TOOLS = {
  'run-exa-webset-search': {
    longRunning: true,
    estDurationMs: 10 * 60_000,
    reason: 'Exa webset search can run up to ~1 hour; p90 ≈ 5-10 min.',
  },
  'fetch-all-past-webset-results': {
    longRunning: true,
    estDurationMs: 5 * 60_000,
    reason: 'Enumerates every webset and deduplicates items.',
  },
  'add-exa-webset-to-prospects': {
    longRunning: true,
    estDurationMs: 3 * 60_000,
    reason: 'Fetch + import of a full webset into Prospects.',
  },
  'run-workflow': {
    longRunning: true,
    estDurationMs: 5 * 60_000,
    reason: 'Compiled workflow graphs may chain multiple slow sub-agents.',
  },
  'workflow-adsIntelligence': {
    longRunning: true,
    estDurationMs: 5 * 60_000,
    reason: 'Parallel ad-library scrape + analysis + brief generation.',
  },
} as const satisfies Record<string, LongRunningToolMetadata>

export type LongRunningToolId = keyof typeof LONG_RUNNING_TOOLS

/**
 * Type guard used by the chat pipeline and workers to detect long-running
 * tools from untyped strings (tool ids coming from model streams).
 */
export function isLongRunningToolId(id: string): id is LongRunningToolId {
  return Object.prototype.hasOwnProperty.call(LONG_RUNNING_TOOLS, id)
}

/**
 * Lookup helper — returns metadata when the id is registered, otherwise null.
 */
export function getLongRunningMetadata(
  id: string
): LongRunningToolMetadata | null {
  return isLongRunningToolId(id) ? LONG_RUNNING_TOOLS[id] : null
}
