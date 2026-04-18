import type { ToolsInput } from '@mastra/core/agent'
import { getSDRTools } from '../agents/sdrAgent'
import { createProspectTools } from '../tools/prospectTools'
import { createRunTools } from '../tools/runTools'
import { wrapToolsForElicitation } from './elicitation'
import { getComposioToolsForProviders } from '@/lib/composio'
import type { ComposioProvider } from '@/types'

/**
 * In-process MCP client. Provides sub-agent factories a single, uniform way
 * to pull primitives out of the internal MCP surface without reaching into
 * sibling agents directly.
 *
 * Physically this runs in-process (no HTTP round-trip) and re-uses the same
 * tool factories that {@link createInternalMCPServer} exposes. Logically it
 * models what `MCPClient.listTools()` would give you — a filtered bag of
 * ready-to-attach Mastra tools, tagged by domain.
 *
 * Why not go over /api/mcp?
 *   - Same process = no serialization cost and no extra auth hop.
 *   - Sub-agents run in the same request as the orchestrator; they already
 *     share the Clerk user + Convex tenant context.
 *   - External clients (other apps, IDE MCP clients) still have the HTTP
 *     endpoint at `/api/mcp` if they want it.
 *
 * Sub-agent factories should call `createInternalMcpClient(ctx).listTools({
 *   include: ['exa', 'runs'] })` instead of importing peer-agent tool
 *   factories.
 */

export interface InternalMcpClientContext {
  userId: string
  tenantId: string
  /** Optional thread id propagated into elicitation approval rows. */
  threadId?: string
  /** Optional run id propagated into elicitation approval rows. */
  runId?: string
  /** Agent that will consume these tools — surfaced on approval cards. */
  agentId?: string
}

/** Tool-domain buckets exposed by the internal MCP client. */
export type InternalMcpDomain =
  | 'prospects'
  | 'exa'
  | 'apollo'
  | 'lemlist'
  | 'outlook'
  | 'gmail'
  | 'searchApi'
  | 'runs'
  | 'artifacts'

export interface ListToolsOptions {
  /** If provided, only tools from these domains are returned. */
  include?: ReadonlyArray<InternalMcpDomain>
  /** Tools from these domains are omitted. Applied after `include`. */
  exclude?: ReadonlyArray<InternalMcpDomain>
}

/** Run/artifact tool ids live in the `runs`/`artifacts` buckets. */
const RUN_TOOL_IDS = new Set<string>([
  'runs-get-status',
  'runs-cancel',
  'runs-list-recent',
  'list-recent-websets',
])
const ARTIFACT_TOOL_IDS = new Set<string>([
  'artifacts-get',
  'write-plan',
])

const COMPOSIO_DOMAINS: ReadonlyArray<
  Extract<InternalMcpDomain, 'apollo' | 'lemlist' | 'outlook' | 'gmail' | 'searchApi'>
> = ['apollo', 'lemlist', 'outlook', 'gmail', 'searchApi']

function splitRunAndArtifactTools(
  tools: ToolsInput
): { runs: ToolsInput; artifacts: ToolsInput } {
  const runs: Record<string, unknown> = {}
  const artifacts: Record<string, unknown> = {}
  for (const [key, tool] of Object.entries(
    tools as Record<string, unknown>
  )) {
    if (RUN_TOOL_IDS.has(key)) {
      runs[key] = tool
    } else if (ARTIFACT_TOOL_IDS.has(key)) {
      artifacts[key] = tool
    } else {
      // Unknown keys default to `runs` so nothing gets silently dropped.
      runs[key] = tool
    }
  }
  return {
    runs: runs as ToolsInput,
    artifacts: artifacts as ToolsInput,
  }
}

export interface InternalMcpClient {
  /**
   * Returns a flat tool bag ready to pass to `new Agent({ tools })`.
   * The selection is domain-filtered via {@link ListToolsOptions}.
   */
  listTools(options?: ListToolsOptions): Promise<ToolsInput>

  /**
   * Same as {@link listTools} but returns a map keyed by domain so callers
   * can inspect which domains were actually available (e.g. Apollo is only
   * present when the user has it connected via Composio).
   */
  listToolsByDomain(
    options?: ListToolsOptions
  ): Promise<Partial<Record<InternalMcpDomain, ToolsInput>>>
}

export function createInternalMcpClient(
  ctx: InternalMcpClientContext
): InternalMcpClient {
  const { userId, tenantId, threadId, runId, agentId } = ctx
  const elicitCtx = { userId, tenantId, threadId, runId, agentId }

  async function loadByDomain(
    options?: ListToolsOptions
  ): Promise<Partial<Record<InternalMcpDomain, ToolsInput>>> {
    const include = options?.include
    const exclude = new Set(options?.exclude ?? [])

    const wants = (d: InternalMcpDomain): boolean => {
      if (exclude.has(d)) return false
      return !include || include.includes(d)
    }

    const byDomain: Partial<Record<InternalMcpDomain, ToolsInput>> = {}

    if (wants('prospects')) {
      byDomain.prospects = createProspectTools(userId) as unknown as ToolsInput
    }
    if (wants('exa')) {
      byDomain.exa = getSDRTools(userId, tenantId) as unknown as ToolsInput
    }
    if (wants('runs') || wants('artifacts')) {
      const split = splitRunAndArtifactTools(
        createRunTools(userId, tenantId) as unknown as ToolsInput
      )
      if (wants('runs')) byDomain.runs = split.runs
      if (wants('artifacts')) byDomain.artifacts = split.artifacts
    }

    // Composio toolkits — pull each in parallel but guarded individually so
    // missing connections never kill the whole client. Every Composio bag is
    // passed through the elicitation wrapper so destructive ids (Lemlist push,
    // Gmail/Outlook send, bulk import, etc.) go through a human-approval gate.
    const composioTargets = COMPOSIO_DOMAINS.filter(wants)
    if (composioTargets.length > 0) {
      await Promise.all(
        composioTargets.map(async (domain) => {
          try {
            const tools = await getComposioToolsForProviders(userId, [
              domain as ComposioProvider,
            ])
            byDomain[domain] = wrapToolsForElicitation(
              tools as unknown as ToolsInput,
              elicitCtx
            )
          } catch (err) {
            console.warn(
              `[mcp.internalClient] Composio provider ${domain} unavailable:`,
              err instanceof Error ? err.message : err
            )
            byDomain[domain] = {} as ToolsInput
          }
        })
      )
    }

    return byDomain
  }

  async function listTools(options?: ListToolsOptions): Promise<ToolsInput> {
    const byDomain = await loadByDomain(options)
    return Object.values(byDomain).reduce<ToolsInput>(
      (acc, tools) =>
        ({
          ...(acc as Record<string, unknown>),
          ...(tools as Record<string, unknown>),
        }) as ToolsInput,
      {} as ToolsInput
    )
  }

  return {
    listTools,
    listToolsByDomain: loadByDomain,
  }
}
