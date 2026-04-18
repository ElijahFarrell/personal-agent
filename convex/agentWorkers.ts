import { v } from 'convex/values'
import { internalAction, type ActionCtx } from './_generated/server'
import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  AGENT_RUN_STATUS,
  MESSAGE_ROLE,
  MESSAGE_SOURCE,
  TABLES,
} from './constants'

/**
 * Convex worker tier for long-running sub-agent operations. The chat route
 * hands off to these actions when a tool would otherwise outlive the Vercel
 * serverless budget (Exa websets, large enrichment jobs). Each worker owns
 * the full lifecycle of its job:
 *
 *   1. Kick off the external work and immediately persist its external ids
 *      to `agentRuns.externalIds` so the job can be recovered after a restart.
 *   2. Poll via `ctx.scheduler.runAfter` — Convex actions have a 60s budget,
 *      so we self-reschedule rather than sitting in a single long invocation.
 *   3. On completion: write the canonical artifact, append an assistant
 *      message to the thread, and flip the agentRun status to `completed`.
 *
 * Keep workers small and focused. Cross-cutting concerns (credits, feature
 * gating, auth) belong upstream in the chat pipeline.
 */

// ─── Exa Websets ───────────────────────────────────────────────────────────

const EXA_BASE = 'https://api.exa.ai'

/** Poll cadence while the webset is still running. */
const EXA_POLL_INTERVAL_MS = 15_000
/** Hard ceiling on total polling duration — Exa FAQ says p90 ≈ 10 min. */
const EXA_MAX_ATTEMPTS = 60 // 60 * 15s = 15 min

interface ExaEnrichment {
  format?: string
  result?: unknown
}

interface ExaItem {
  properties?: Record<string, unknown>
  company?: Record<string, unknown>
  name?: string
  title?: string
  enrichments?: ExaEnrichment[]
}

interface NormalizedCompany {
  companyName: string
  email?: string
  linkedinUrl?: string
  domain?: string
}

function asStr(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim() ? val.trim() : undefined
}

function firstFromEnrichmentResult(result: unknown): string | undefined {
  if (Array.isArray(result)) return asStr(result[0])
  return asStr(result)
}

function extractDomain(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

function normalizeItem(item: ExaItem): NormalizedCompany | null {
  const props = item.properties ?? {}
  const companyObj = props.company as Record<string, unknown> | undefined
  const legacy = item.company
  const name = asStr(
    companyObj?.name ??
      (props as Record<string, unknown>).name ??
      legacy?.name ??
      item.name ??
      item.title
  )
  if (!name) return null

  let email: string | undefined
  let linkedinUrl: string | undefined
  let domain: string | undefined

  for (const enrichment of item.enrichments ?? []) {
    const value = firstFromEnrichmentResult(enrichment.result)
    if (!value) continue
    if (enrichment.format === 'email' && !email) {
      email = value
    } else if (enrichment.format === 'url' && !linkedinUrl && /linkedin/i.test(value)) {
      linkedinUrl = value
    } else if (enrichment.format === 'url' && !domain) {
      domain = extractDomain(value)
    }
  }

  if (!domain) {
    domain = extractDomain(asStr((props as Record<string, unknown>).url))
  }

  return { companyName: name, email, linkedinUrl, domain }
}

async function exaFetch(
  apiKey: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${EXA_BASE}${path}`, {
    ...init,
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

function requireApiKey(): string {
  const key = process.env.EXA_API_KEY
  if (!key?.trim()) {
    throw new Error(
      'EXA_API_KEY is not configured in Convex. Set it with `npx convex env set EXA_API_KEY <key>`.'
    )
  }
  return key
}

/**
 * Kick off a company webset. Returns immediately after creating the webset
 * and scheduling the first poll. Status lives on the `agentRuns` row —
 * callers should subscribe to `api.agentRuns.getById(runId)` for updates.
 */
export const runExaWebset = internalAction({
  args: {
    runId: v.id(TABLES.AGENT_RUNS),
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    threadId: v.string(),
    query: v.string(),
    count: v.number(),
  },
  handler: async (ctx, args): Promise<{ websetId: string }> => {
    const apiKey = requireApiKey()

    await ctx.runMutation(api.agentRuns.updateStatus, {
      runId: args.runId,
      status: AGENT_RUN_STATUS.RUNNING,
    })
    await ctx.runMutation(api.runProgress.append, {
      runId: args.runId,
      tenantId: args.tenantId,
      kind: 'exa.webset.create',
      message: `Creating Exa webset for "${args.query}" (count ${args.count}).`,
    })

    const response = await exaFetch(apiKey, '/websets/v0/websets', {
      method: 'POST',
      body: JSON.stringify({
        search: {
          query: args.query,
          count: args.count,
          entity: { type: 'company' },
        },
        enrichments: [
          { description: 'Primary contact or CEO email address', format: 'email' },
          { description: 'Company LinkedIn profile URL', format: 'url' },
          { description: 'Company website domain or URL', format: 'url' },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      const msg = `Exa create failed (${response.status}): ${text.slice(0, 500)}`
      await ctx.runMutation(api.agentRuns.updateStatus, {
        runId: args.runId,
        status: AGENT_RUN_STATUS.FAILED,
        error: msg,
      })
      throw new Error(msg)
    }

    const created = (await response.json()) as { id?: string }
    const websetId = created.id
    if (!websetId) {
      const msg = 'Exa create response missing id.'
      await ctx.runMutation(api.agentRuns.updateStatus, {
        runId: args.runId,
        status: AGENT_RUN_STATUS.FAILED,
        error: msg,
      })
      throw new Error(msg)
    }

    await ctx.runMutation(api.agentRuns.setExternalIds, {
      runId: args.runId,
      externalIds: { websetId },
    })
    await ctx.runMutation(api.runProgress.append, {
      runId: args.runId,
      tenantId: args.tenantId,
      kind: 'exa.webset.created',
      message: `Webset ${websetId} created — polling for results.`,
      data: { websetId },
    })

    await ctx.scheduler.runAfter(
      EXA_POLL_INTERVAL_MS,
      internal.agentWorkers.pollExaWebset,
      {
        runId: args.runId,
        tenantId: args.tenantId,
        userId: args.userId,
        threadId: args.threadId,
        websetId,
        query: args.query,
        count: args.count,
        attempts: 0,
      }
    )

    return { websetId }
  },
})

/**
 * Self-rescheduling poll step. Each invocation does one status check and
 * either writes the final artifact + assistant message or reschedules itself.
 */
export const pollExaWebset = internalAction({
  args: {
    runId: v.id(TABLES.AGENT_RUNS),
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    threadId: v.string(),
    websetId: v.string(),
    query: v.string(),
    count: v.number(),
    attempts: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const apiKey = requireApiKey()

    const existingRun = await ctx.runQuery(api.agentRuns.getById, {
      runId: args.runId,
    })
    if (!existingRun) return
    if (
      existingRun.status === AGENT_RUN_STATUS.CANCELLED ||
      existingRun.status === AGENT_RUN_STATUS.COMPLETED ||
      existingRun.status === AGENT_RUN_STATUS.FAILED
    ) {
      return
    }

    let statusResp: Response
    try {
      statusResp = await exaFetch(
        apiKey,
        `/websets/v0/websets/${args.websetId}`,
        { method: 'GET' }
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await ctx.runMutation(api.runProgress.append, {
        runId: args.runId,
        tenantId: args.tenantId,
        kind: 'exa.webset.poll.error',
        message: `Poll attempt ${args.attempts + 1} failed: ${msg}`,
      })
      return rescheduleOrGiveUp(ctx, args, 'transient-error')
    }

    if (!statusResp.ok) {
      const text = await statusResp.text().catch(() => '')
      await ctx.runMutation(api.runProgress.append, {
        runId: args.runId,
        tenantId: args.tenantId,
        kind: 'exa.webset.poll.error',
        message: `Exa status ${statusResp.status}: ${text.slice(0, 200)}`,
      })
      return rescheduleOrGiveUp(ctx, args, `status-${statusResp.status}`)
    }

    const statusJson = (await statusResp.json()) as {
      status?: string
      state?: string
    }
    const state = (statusJson.status ?? statusJson.state ?? '').toLowerCase()
    const isTerminal = state === 'idle' || state === 'completed'

    if (!isTerminal) {
      return rescheduleOrGiveUp(ctx, args, `state-${state || 'unknown'}`)
    }

    const items = await fetchItems(apiKey, args.websetId, args.count)
    await finalize(ctx, args, items, /* isTimeout */ false)
  },
})

async function rescheduleOrGiveUp(
  ctx: ActionCtx,
  args: {
    runId: Id<'agentRuns'>
    tenantId: Id<'tenants'>
    userId: Id<'users'>
    threadId: string
    websetId: string
    query: string
    count: number
    attempts: number
  },
  reason: string
): Promise<void> {
  const next = args.attempts + 1
  if (next >= EXA_MAX_ATTEMPTS) {
    const items = await fetchItems(
      requireApiKey(),
      args.websetId,
      args.count
    ).catch(() => [] as NormalizedCompany[])
    await finalize(ctx, args, items, /* isTimeout */ true, reason)
    return
  }
  await ctx.scheduler.runAfter(
    EXA_POLL_INTERVAL_MS,
    internal.agentWorkers.pollExaWebset,
    { ...args, attempts: next }
  )
}

async function fetchItems(
  apiKey: string,
  websetId: string,
  limit: number
): Promise<NormalizedCompany[]> {
  const resp = await exaFetch(
    apiKey,
    `/websets/v0/websets/${websetId}/items?limit=${Math.max(1, Math.min(limit, 100))}`,
    { method: 'GET' }
  )
  if (!resp.ok) return []
  const body = (await resp.json()) as { data?: unknown[]; items?: unknown[] }
  const raw = (body.data ?? body.items ?? []) as ExaItem[]
  const results: NormalizedCompany[] = []
  for (const item of raw) {
    const norm = normalizeItem(item)
    if (norm) results.push(norm)
  }
  return results
}

async function finalize(
  ctx: ActionCtx,
  args: {
    runId: Id<'agentRuns'>
    tenantId: Id<'tenants'>
    userId: Id<'users'>
    threadId: string
    websetId: string
    query: string
    count: number
  },
  companies: NormalizedCompany[],
  isTimeout: boolean,
  reason?: string
): Promise<void> {
  const artifactId = await ctx.runMutation(api.artifacts.create, {
    tenantId: args.tenantId,
    userId: args.userId,
    runId: args.runId,
    kind: 'exa.websetItems',
    title: `Exa search: ${args.query}`,
    summary: `${companies.length} companies (webset ${args.websetId}${isTimeout ? ', partial' : ''})`,
    data: { companies, websetId: args.websetId, query: args.query },
  })

  const preview = companies
    .slice(0, 5)
    .map((c, i) => {
      const bits = [c.companyName]
      if (c.email) bits.push(`<${c.email}>`)
      if (c.domain) bits.push(`(${c.domain})`)
      return `${i + 1}. ${bits.join(' ')}`
    })
    .join('\n')
  const more =
    companies.length > 5 ? `\n… +${companies.length - 5} more` : ''

  const header = isTimeout
    ? `Exa webset ${args.websetId} timed out (${reason ?? 'max attempts'}) — returning ${companies.length} partial companies.`
    : `Exa webset ${args.websetId} finished — ${companies.length} companies.`

  await ctx.runMutation(api.messages.saveMessage, {
    tenantId: args.tenantId,
    userId: args.userId,
    role: MESSAGE_ROLE.ASSISTANT,
    source: MESSAGE_SOURCE.WEB,
    threadId: args.threadId,
    content: `${header}\n\n${preview}${more}\n\nArtifact: \`${artifactId}\``,
    metadata: {
      toolCalls: [
        {
          toolName: 'run-exa-webset-search.worker',
          state: isTimeout ? 'partial' : 'completed',
          args: { query: args.query, count: args.count },
          result: { artifactId, websetId: args.websetId, companies: companies.length },
        },
      ],
    },
  })

  await ctx.runMutation(api.runProgress.append, {
    runId: args.runId,
    tenantId: args.tenantId,
    kind: isTimeout ? 'exa.webset.timeout' : 'exa.webset.completed',
    message: header,
    data: { artifactId, websetId: args.websetId, count: companies.length },
  })

  await ctx.runMutation(api.agentRuns.updateStatus, {
    runId: args.runId,
    status: isTimeout
      ? AGENT_RUN_STATUS.FAILED
      : AGENT_RUN_STATUS.COMPLETED,
    output: { artifactId, websetId: args.websetId, count: companies.length },
    ...(isTimeout ? { error: `Exa timeout (${reason ?? 'max attempts'})` } : {}),
  })
}

// ─── Past-websets backfill cron ─────────────────────────────────────────────

/** Cap on how many items the cron will pull per webset per run. */
const PAST_WEBSET_ITEMS_PER_SYNC = 100
/** Safety cap on how many runs we sync in a single cron tick. */
const PAST_WEBSET_MAX_RUNS_PER_TICK = 50

/**
 * Walk every agentRun that has an `externalIds.websetId`, pull the latest
 * items from Exa, and upsert them into the tenant-scoped `websetItems` table.
 * Keeps past search results addressable from the orchestrator tool surface
 * without re-hitting the Exa API on every user turn.
 *
 * Designed to be cheap: caps the scan window, bails on missing API key,
 * and swallows per-webset errors so one bad ID doesn't block the backfill.
 */
export const pullPastWebsets = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    websets: v.number(),
    items: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, { limit }) => {
    const apiKey = process.env.EXA_API_KEY?.trim()
    if (!apiKey) {
      console.warn('[agentWorkers.pullPastWebsets] EXA_API_KEY not set; skipping.')
      return { websets: 0, items: 0, errors: 0 }
    }

    const runs = (await ctx.runQuery(internal.agentRuns.listRunsWithWebsetId, {
      limit: Math.min(limit ?? PAST_WEBSET_MAX_RUNS_PER_TICK, 200),
    })) as Array<{
      runId: Id<'agentRuns'>
      tenantId: Id<'tenants'>
      websetId: string
      title?: string
    }>

    let itemsSynced = 0
    let errors = 0
    const seenWebsets = new Set<string>()

    for (const run of runs) {
      const key = `${run.tenantId}:${run.websetId}`
      if (seenWebsets.has(key)) continue
      seenWebsets.add(key)

      try {
        const items = await fetchItems(apiKey, run.websetId, PAST_WEBSET_ITEMS_PER_SYNC)
        for (const company of items) {
          await ctx.runMutation(internal.websetItems.upsert, {
            tenantId: run.tenantId,
            websetId: run.websetId,
            sourceRunId: run.runId,
            itemKey: company.companyName.toLowerCase(),
            companyName: company.companyName,
            email: company.email,
            linkedinUrl: company.linkedinUrl,
            domain: company.domain,
            websetTitle: run.title,
          })
          itemsSynced++
        }
      } catch (err) {
        errors++
        console.warn(
          `[agentWorkers.pullPastWebsets] Failed to sync webset ${run.websetId}:`,
          err instanceof Error ? err.message : err
        )
      }
    }

    return { websets: seenWebsets.size, items: itemsSynced, errors }
  },
})
