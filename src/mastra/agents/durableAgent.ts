import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AGENT_RUN_STATUS } from '@convex/constants'

/**
 * Durable agent reconnect helpers. Mastra's native `createDurableAgent` is not
 * yet available in the installed `@mastra/core` build, so we provide an
 * equivalent that streams state from Convex:
 *
 *   - `observeRun(runId)` polls `agentRuns.getById` + `runProgress.listForRun`
 *     and emits Server-Sent Events whenever something changes.
 *   - Terminates when the run reaches a terminal status or the caller-defined
 *     `maxDurationMs` elapses. The browser can reconnect freely because all
 *     state lives in Convex.
 *
 * This is intentionally small — once Mastra ships native durable agents we can
 * swap the implementation without touching the chat route.
 */

const TERMINAL_STATUSES = new Set<string>([
  AGENT_RUN_STATUS.COMPLETED,
  AGENT_RUN_STATUS.FAILED,
  AGENT_RUN_STATUS.CANCELLED,
])

export interface ObserveRunOptions {
  runId: Id<'agentRuns'>
  tenantId?: string
  /** Polling cadence for Convex queries (default 1s). */
  pollIntervalMs?: number
  /** Upper bound on observation duration (default 15 min). */
  maxDurationMs?: number
}

/**
 * Returns a Server-Sent Events stream for the given run. Consumers should
 * pipe this directly to a `Response` with `Content-Type: text/event-stream`.
 */
export function observeRun(opts: ObserveRunOptions): ReadableStream<Uint8Array> {
  const pollIntervalMs = opts.pollIntervalMs ?? 1_000
  const maxDurationMs = opts.maxDurationMs ?? 15 * 60_000
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const deadline = Date.now() + maxDurationMs
      let lastStatus: string | null = null
      let lastProgressAt = 0
      let closed = false

      const write = (event: string, data: unknown): void => {
        if (closed) return
        const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(frame))
      }

      const close = (): void => {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      write('open', { runId: opts.runId })

      while (!closed && Date.now() < deadline) {
        try {
          const run = await convex.query(api.agentRuns.getById, {
            runId: opts.runId,
          })
          if (!run) {
            write('error', { message: 'Run not found.' })
            break
          }
          if (opts.tenantId && String(run.tenantId) !== opts.tenantId) {
            write('error', { message: 'Run belongs to a different tenant.' })
            break
          }

          if (run.status !== lastStatus) {
            lastStatus = run.status
            write('status', {
              runId: String(run._id),
              status: run.status,
              agentId: run.agentId,
              externalIds: run.externalIds,
              error: run.error,
              output: run.output,
              updatedAt: run.updatedAt,
            })
          }

          const progress = await convex.query(api.runProgress.listForRun, {
            runId: opts.runId,
            limit: 200,
          })
          for (const entry of progress) {
            if (entry.createdAt <= lastProgressAt) continue
            lastProgressAt = entry.createdAt
            write('progress', {
              kind: entry.kind,
              message: entry.message,
              data: entry.data,
              createdAt: entry.createdAt,
            })
          }

          if (TERMINAL_STATUSES.has(run.status)) {
            write('done', { status: run.status })
            break
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          write('error', { message })
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
      }

      if (!closed && Date.now() >= deadline) {
        write('timeout', { after: maxDurationMs })
      }

      close()
    },
    cancel() {
      // caller disconnected — nothing to tear down; next poll short-circuits.
    },
  })
}
