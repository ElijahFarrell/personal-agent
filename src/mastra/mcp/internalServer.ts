import { MCPServer } from '@mastra/mcp'
import type { ToolsInput } from '@mastra/core/agent'
import { getSDRTools } from '../agents/sdrAgent'
import { createProspectTools } from '../tools/prospectTools'
import { createRunTools } from '../tools/runTools'
import { wrapToolsForElicitation } from './elicitation'
import { adsIntelligenceWorkflow } from '../workflows/adsIntelligencePipeline'
import { getComposioToolsForProviders } from '@/lib/composio'
import type { ComposioProvider } from '@/types'

/**
 * Internal MCP server exposing the cross-agent primitives that used to live
 * behind direct cross-agent imports (e.g. leadAgent reaching into sdrAgent).
 *
 * Surface, grouped by domain:
 *   - `prospects.*` — Convex-backed prospect CRUD (list/get/create/update/…)
 *   - `exa.*`       — Exa Websets search, fetch, past-websets, import helpers
 *   - `apollo.*`    — Composio Apollo toolkit (when the user has it connected)
 *   - `lemlist.*`   — Composio Lemlist toolkit (when the user has it connected)
 *   - `ads.*`       — competitive ads intelligence workflow (`run_adsIntelligence`)
 *   - `artifacts.*` — `artifacts-get`, `write-plan`
 *   - `runs.*`      — `runs-get-status`, `runs-cancel`, `runs-list-recent`,
 *                     `list-recent-websets`
 *
 * The server is constructed per request using the user/tenant from Clerk, so
 * every Composio session, Convex query, and run-scoped tool call is properly
 * scoped to the caller. The server is stateless — callers should dispose of
 * it (or let GC reclaim it) after each request.
 */

export interface InternalMcpContext {
  /** Clerk user id used by Convex (via `getUserByClerkUserId`) and Composio. */
  userId: string
  /** Convex tenant id owning this request. Used to scope run/artifact tools. */
  tenantId: string
}

/** Composio toolkits exposed by the internal MCP server. */
const MCP_COMPOSIO_PROVIDERS: readonly ComposioProvider[] = [
  'apollo',
  'lemlist',
  'searchApi',
] as const

/**
 * Build a tenant-scoped internal MCPServer. Safe to call once per request.
 * Returns a live MCPServer — caller is responsible for serving it (e.g. via
 * `startHTTP({ serverless: true })` from a Next.js route handler).
 */
export async function createInternalMCPServer(
  ctx: InternalMcpContext
): Promise<MCPServer> {
  const { userId, tenantId } = ctx

  const exaTools = getSDRTools(userId, tenantId) as unknown as ToolsInput
  const prospectTools = createProspectTools(userId) as unknown as ToolsInput
  const runTools = createRunTools(userId, tenantId) as unknown as ToolsInput

  // Composio toolkits — each guarded individually so a failure in one (e.g.
  // Apollo not connected yet) doesn't take down the whole MCP surface.
  const composioResults = await Promise.all(
    MCP_COMPOSIO_PROVIDERS.map(async (provider) => {
      try {
        const tools = await getComposioToolsForProviders(userId, [provider])
        return tools as Record<string, unknown>
      } catch (err) {
        console.warn(
          `[mcp.internalServer] Composio provider ${provider} unavailable:`,
          err instanceof Error ? err.message : err
        )
        return {}
      }
    })
  )
  const composioTools = wrapToolsForElicitation(
    Object.assign({}, ...composioResults) as unknown as ToolsInput,
    { userId, tenantId, agentId: 'mcp-external' }
  )

  return new MCPServer({
    id: `personal-agent-internal-${tenantId}`,
    name: 'personal-agent-internal',
    version: process.env.npm_package_version ?? '0.1.0',
    description:
      'Internal MCP server exposing prospects/exa/apollo/lemlist/ads/artifacts/runs primitives to sub-agents.',
    tools: {
      ...(prospectTools as Record<string, unknown>),
      ...(exaTools as Record<string, unknown>),
      ...(composioTools as Record<string, unknown>),
      ...(runTools as Record<string, unknown>),
    } as ToolsInput,
    workflows: { adsIntelligence: adsIntelligenceWorkflow },
  })
}
