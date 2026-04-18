import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ToolsInput } from '@mastra/core/agent'

/**
 * MCP-style elicitation gate for destructive tool calls.
 *
 * Mastra (and the underlying Vercel AI SDK) executes tools directly — there is
 * no native "elicitation" wire event to block on. We get the same effect by
 * wrapping destructive tools: the wrapped `execute` short-circuits the first
 * invocation with `NEEDS_APPROVAL`, persists a pending row in Convex, and only
 * calls the underlying tool once the orchestrator retries with an
 * `approvalToken` that maps to an APPROVED row.
 *
 * Tool ids matched by {@link isDestructiveToolId} are:
 *   - Lemlist sequence / campaign mutations (push leads, launch, send)
 *   - Email sends across Gmail / Outlook
 *   - Apollo-style outbound + bulk import / enrichment writes
 *   - Any id whose name clearly encodes a destructive verb (DELETE_, REMOVE_, SEND_, PUSH_)
 *
 * The list is deliberately broad — false positives add an approval step; false
 * negatives silently send email.
 */

const DESTRUCTIVE_PATTERNS: readonly RegExp[] = [
  /_SEND_/i,
  /^SEND_/i,
  /_SEND$/i,
  /_PUSH_/i,
  /^PUSH_/i,
  /_DELETE_/i,
  /^DELETE_/i,
  /_REMOVE_/i,
  /^REMOVE_/i,
  /_ADD_LEADS?_TO_/i,
  /_ADD_CONTACTS?_TO_/i,
  /_LAUNCH_CAMPAIGN/i,
  /_START_CAMPAIGN/i,
  /_BULK_IMPORT/i,
  /_IMPORT_/i,
  /GMAIL_SEND/i,
  /OUTLOOK_SEND/i,
  /LEMLIST_(ADD|PUSH|SEND|LAUNCH|UPDATE|DELETE)/i,
  /APOLLO_(PUSH|SEND|ADD|BULK)/i,
]

/** Fast id check — does this tool need human approval before it runs? */
export function isDestructiveToolId(id: string | undefined | null): boolean {
  if (!id) return false
  return DESTRUCTIVE_PATTERNS.some((r) => r.test(id))
}

export interface ElicitationContext {
  userId: string
  tenantId: string
  /** Optional thread id to scope approval cards per chat session. */
  threadId?: string
  /** Optional agent run id the approval is blocking. */
  runId?: string
  /** Agent that requested the action (e.g. `agent-lead`, `agent-email`). */
  agentId?: string
}

/** Argument key that must carry a prior approval token to bypass the gate. */
export const APPROVAL_TOKEN_ARG = 'approvalToken'

interface NeedsApprovalEnvelope {
  ok: false
  error: {
    code: 'NEEDS_APPROVAL'
    message: string
    retryable: true
    details: {
      approvalId: string
      approvalToken: string
      toolId: string
      summary: string
    }
  }
}

interface RejectedEnvelope {
  ok: false
  error: {
    code: 'APPROVAL_REJECTED' | 'APPROVAL_EXPIRED' | 'APPROVAL_INVALID'
    message: string
    retryable: false
    details?: Record<string, unknown>
  }
}

function getConvex(): ConvexHttpClient | null {
  return process.env.NEXT_PUBLIC_CONVEX_URL
    ? new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
    : null
}

function randomToken(): string {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

function extractApprovalToken(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined
  const raw = (input as Record<string, unknown>)[APPROVAL_TOKEN_ARG]
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined
}

function stripApprovalToken<T>(input: T): T {
  if (!input || typeof input !== 'object') return input
  const clone = { ...(input as Record<string, unknown>) }
  delete clone[APPROVAL_TOKEN_ARG]
  return clone as T
}

/**
 * Generate a short summary for the approval card. Sub-second, no LLM — just
 * pulls a handful of stable keys (`subject`, `to`, `email`, `campaign`, etc.)
 * so the user knows what they're approving.
 */
function summarizeArgs(toolId: string, args: unknown): string {
  if (!args || typeof args !== 'object') {
    return `${toolId} (no arguments)`
  }
  const a = args as Record<string, unknown>
  const candidates: Array<[string, unknown]> = [
    ['to', a['to']],
    ['recipient', a['recipient']],
    ['email', a['email']],
    ['subject', a['subject']],
    ['campaign', a['campaign']],
    ['campaignId', a['campaignId']],
    ['listId', a['listId']],
    ['count', Array.isArray(a['leads']) ? a['leads']?.length : undefined],
  ]
  const shown = candidates
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) =>
      typeof v === 'string' ? `${k}: ${v.slice(0, 80)}` : `${k}: ${String(v)}`
    )
    .slice(0, 4)
  if (shown.length === 0) return toolId
  return `${toolId} — ${shown.join(', ')}`
}

interface ToolLike {
  id?: string
  description?: string
  inputSchema?: unknown
  outputSchema?: unknown
  execute?: (input: unknown, options?: unknown) => unknown | Promise<unknown>
}

function buildElicitDescription(original: string | undefined): string {
  const base = original ?? ''
  const note =
    'Destructive action — first invocation returns NEEDS_APPROVAL and registers a pending approval. ' +
    'Re-call with the same arguments plus `approvalToken` once the user has approved via the UI.'
  return base ? `${base}\n\n${note}` : note
}

/**
 * Wrap a single Mastra-style tool so that it gates destructive execution
 * behind a Convex-backed approval row. Non-destructive tools are returned
 * as-is via {@link wrapToolsForElicitation}; this function always gates.
 */
export function wrapToolWithElicitation(
  toolId: string,
  tool: unknown,
  ctx: ElicitationContext
): unknown {
  const t = tool as ToolLike | null
  if (!t || typeof t !== 'object' || typeof t.execute !== 'function') {
    return tool
  }

  const originalExecute = t.execute.bind(t) as (
    input: unknown,
    options?: unknown
  ) => Promise<unknown>

  const gatedExecute = async (
    input: unknown,
    options?: unknown
  ): Promise<unknown> => {
    const token = extractApprovalToken(
      // Mastra passes {context, ...} OR the raw input depending on version.
      (input as { context?: unknown })?.context ?? input
    )

    const convex = getConvex()

    if (token) {
      if (!convex) {
        const err: RejectedEnvelope = {
          ok: false,
          error: {
            code: 'APPROVAL_INVALID',
            message:
              'Convex is not configured; cannot validate approval tokens.',
            retryable: false,
          },
        }
        return err
      }
      const consumed = await convex.mutation(api.approvals.consumeToken, {
        approvalToken: token,
        toolId,
      })
      if (!consumed.ok) {
        const code: RejectedEnvelope['error']['code'] =
          consumed.reason === 'expired'
            ? 'APPROVAL_EXPIRED'
            : consumed.reason === 'rejected' || consumed.reason === 'pending'
              ? 'APPROVAL_REJECTED'
              : 'APPROVAL_INVALID'
        const err: RejectedEnvelope = {
          ok: false,
          error: {
            code,
            message: `Approval token rejected (${consumed.reason ?? 'unknown'}).`,
            retryable: false,
            details: { reason: consumed.reason },
          },
        }
        return err
      }

      // Approved — strip the token so the underlying tool sees its original
      // inputSchema (which usually doesn't declare approvalToken).
      if ((input as { context?: unknown })?.context) {
        const cloned = { ...(input as Record<string, unknown>) }
        cloned.context = stripApprovalToken((input as { context: unknown }).context)
        return originalExecute(cloned, options)
      }
      return originalExecute(stripApprovalToken(input), options)
    }

    // No token — request one.
    const rawArgs =
      (input as { context?: unknown })?.context ?? input
    const summary = summarizeArgs(toolId, rawArgs)

    if (!convex) {
      const envelope: NeedsApprovalEnvelope = {
        ok: false,
        error: {
          code: 'NEEDS_APPROVAL',
          message:
            'Human approval required. (Convex is not configured; approval cannot be persisted.)',
          retryable: true,
          details: {
            approvalId: 'unavailable',
            approvalToken: 'unavailable',
            toolId,
            summary,
          },
        },
      }
      return envelope
    }

    const generatedToken = randomToken()
    const { approvalId, approvalToken } = await convex.mutation(
      api.approvals.request,
      {
        tenantId: ctx.tenantId as Id<'tenants'>,
        userId: ctx.userId as Id<'users'>,
        threadId: ctx.threadId,
        runId: ctx.runId as Id<'agentRuns'> | undefined,
        agentId: ctx.agentId,
        toolId,
        summary,
        toolArgs: rawArgs,
        approvalToken: generatedToken,
      }
    )

    const envelope: NeedsApprovalEnvelope = {
      ok: false,
      error: {
        code: 'NEEDS_APPROVAL',
        message:
          `Human approval required for "${toolId}". ` +
          `Surface an approval card to the user, then re-call this tool with ` +
          `the original arguments plus \`approvalToken: "${approvalToken}"\`.`,
        retryable: true,
        details: {
          approvalId: String(approvalId),
          approvalToken,
          toolId,
          summary,
        },
      },
    }
    return envelope
  }

  return {
    ...t,
    description: buildElicitDescription(t.description),
    execute: gatedExecute,
  }
}

/**
 * Wrap every destructive tool in the given bag; pass-through everything else.
 * Safe to call on any {@link ToolsInput} — tools without `execute` are left
 * untouched.
 */
export function wrapToolsForElicitation(
  tools: ToolsInput,
  ctx: ElicitationContext
): ToolsInput {
  const wrapped: Record<string, unknown> = {}
  for (const [key, tool] of Object.entries(tools as Record<string, unknown>)) {
    const id = (tool as ToolLike)?.id ?? key
    if (isDestructiveToolId(id)) {
      wrapped[key] = wrapToolWithElicitation(id, tool, ctx)
    } else {
      wrapped[key] = tool
    }
  }
  return wrapped as ToolsInput
}
