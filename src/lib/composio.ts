/**
 * Composio client for OAuth integrations.
 * Uses user ID (Clerk) as the Composio entity ID for connected accounts.
 */
import { Composio } from '@composio/core'
import { MastraProvider } from '@composio/mastra'
import { config } from '@/lib/config'
import {
  COMPOSIO_PROVIDERS,
  getToolkitForProvider,
  getProviderForToolkit,
} from './composioMappings'
import type { ComposioProvider } from '@/types'

let composioInstance: Composio | null = null

function getComposio(): Composio {
  if (!config.composio.apiKey) {
    throw new Error('COMPOSIO_API_KEY is not configured')
  }
  if (!composioInstance) {
    composioInstance = new Composio({ apiKey: config.composio.apiKey })
  }
  return composioInstance
}

/**
 * Creates a Composio session for the given user.
 * Use this for authorize(), toolkits(), and tools().
 */
export async function createComposioSession(userId: string) {
  const composio = getComposio()
  return composio.create(userId, { manageConnections: false })
}

/**
 * Gets the Connect Link URL for authorizing a toolkit.
 * Redirect the user to this URL to complete auth.
 */
export async function getAuthorizeUrl(
  userId: string,
  provider: ComposioProvider,
  callbackUrl?: string
): Promise<string> {
  const toolkit = getToolkitForProvider(provider)
  if (!toolkit) {
    throw new Error(`Unknown Composio provider: ${provider}`)
  }

  const session = await createComposioSession(userId)
  const connectionRequest = await session.authorize(toolkit, {
    callbackUrl,
  })
  const url = connectionRequest.redirectUrl
  if (!url) throw new Error('Composio authorize did not return a redirect URL')
  return url
}

/**
 * Removes all Composio connected accounts for this user and toolkit (provider).
 * Use when the user wants to disconnect and reconnect from Integrations.
 */
export async function disconnectComposioProvider(
  userId: string,
  provider: ComposioProvider
): Promise<{ disconnected: number }> {
  if (!config.composio.apiKey) {
    throw new Error('COMPOSIO_API_KEY is not configured')
  }
  const toolkit = getToolkitForProvider(provider)
  if (!toolkit) {
    throw new Error(`Unknown Composio provider: ${provider}`)
  }

  const composio = getComposio()
  const { items } = await composio.connectedAccounts.list({
    userIds: [userId],
    toolkitSlugs: [toolkit],
  })

  let disconnected = 0
  for (const account of items ?? []) {
    if (!account.id) continue
    await composio.connectedAccounts.delete(account.id)
    disconnected += 1
  }

  return { disconnected }
}

/**
 * Lists all ACTIVE connected accounts for this user (paginated).
 * Prefer this over session.toolkits alone: toolkits batch responses can omit rows
 * when many slugs are requested or the API paginates, which hid real connections in the UI.
 */
async function listActiveConnectedAccountsForUser(userId: string) {
  const composio = getComposio()
  const accounts: Array<{ toolkitSlug: string }> = []
  let cursor: string | null | undefined = undefined

  do {
    const page = await composio.connectedAccounts.list({
      userIds: [userId],
      statuses: ['ACTIVE'],
      limit: 100,
      ...(cursor ? { cursor } : {}),
    })
    for (const account of page.items ?? []) {
      const slug = account.toolkit?.slug
      if (slug) accounts.push({ toolkitSlug: slug })
    }
    cursor = page.nextCursor ?? null
  } while (cursor)

  return accounts
}

/**
 * Returns connection status for all Composio-backed providers.
 */
export async function getComposioConnectionStatus(
  userId: string
): Promise<Record<ComposioProvider, boolean>> {
  if (!config.composio.apiKey) {
    return Object.fromEntries(
      COMPOSIO_PROVIDERS.map((p) => [p, false])
    ) as Record<ComposioProvider, boolean>
  }

  const session = await createComposioSession(userId)
  // Request our providers explicitly — default returns top 20 by popularity, Apollo may be excluded
  const toolkitSlugs = COMPOSIO_PROVIDERS.map((p) => getToolkitForProvider(p)).filter(
    (t): t is string => !!t
  )
  const toolkits = await session.toolkits({ toolkits: toolkitSlugs })

  const status: Record<string, boolean> = Object.fromEntries(
    COMPOSIO_PROVIDERS.map((p) => [p, false])
  )

  for (const item of toolkits.items) {
    const provider = getProviderForToolkit(item.slug ?? '')
    // Only trust explicit connection signals — connection object can exist for unconnected toolkits
    const isConnected =
      item.connection?.isActive === true || !!item.connection?.connectedAccount
    if (provider && isConnected) {
      status[provider] = true
    }
  }

  const activeAccounts = await listActiveConnectedAccountsForUser(userId)
  for (const { toolkitSlug } of activeAccounts) {
    const provider = getProviderForToolkit(toolkitSlug)
    if (provider) {
      status[provider] = true
    }
  }

  return status as Record<ComposioProvider, boolean>
}

export type ExecuteComposioToolOptions = {
  /** Pin a Composio toolkit version (e.g. `20250909_00`). Prefer over skip in production. */
  version?: string
}

/**
 * Executes a Composio tool directly. Use for service-layer calls (e.g. inbox sync, Gmail send).
 *
 * Manual `tools.execute` requires a concrete toolkit version unless explicitly skipped.
 * Agent/session code paths skip this; we use `dangerouslySkipVersionCheck` here so server
 * calls work without env pins. For production stability, set `COMPOSIO_TOOLKIT_VERSION_<slug>`
 * (lowercase slug, e.g. `GMAIL`) or pass `version` per call.
 */
export async function executeComposioTool<T = unknown>(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  options?: ExecuteComposioToolOptions
): Promise<{ successful: boolean; data?: T; error?: string }> {
  const composio = getComposio()
  const result = await composio.tools.execute(toolName, {
    userId,
    arguments: args,
    ...(options?.version
      ? { version: options.version }
      : { dangerouslySkipVersionCheck: true }),
  })
  return {
    successful: !!result.successful,
    data: result.data as T | undefined,
    error: result.error ?? undefined,
  }
}

/**
 * Options for {@link getComposioToolsForProviders}.
 *
 * `elicit`, when provided, wraps every returned tool through the MCP
 * elicitation gate so destructive ids (Lemlist push, Gmail/Outlook send, bulk
 * imports, etc.) short-circuit the first call with `NEEDS_APPROVAL` and
 * persist a Convex approval row. Non-destructive tool ids pass through.
 */
export interface ComposioToolsOptions {
  elicit?: {
    tenantId: string
    threadId?: string
    runId?: string
    agentId?: string
  }
}

/**
 * Returns Composio tools for the given providers (toolkits).
 * Use with Mastra agents. Only includes toolkits the user has connected.
 *
 * Pass `options.elicit` to route destructive tool calls through the MCP
 * elicitation gate — strongly recommended anywhere tenantId is available.
 */
export async function getComposioToolsForProviders(
  userId: string,
  providers: ComposioProvider[],
  options: ComposioToolsOptions = {}
): Promise<Record<string, unknown>> {
  if (!config.composio.apiKey || providers.length === 0) {
    return {}
  }

  const status = await getComposioConnectionStatus(userId)
  const connected = providers.filter((p) => status[p])
  if (connected.length === 0) return {}

  const toolkits = connected
    .map((p) => getToolkitForProvider(p))
    .filter((t): t is string => !!t)

  const composio = new Composio({
    apiKey: config.composio.apiKey,
    provider: new MastraProvider(),
  })

  const session = await composio.create(userId, {
    manageConnections: false,
    toolkits,
  })

  const tools = (await session.tools()) ?? {}
  if (!options.elicit) {
    return tools as Record<string, unknown>
  }

  // Late-import to avoid pulling Mastra-only modules into Composio setup paths
  // used by non-agent surfaces (webhooks, admin tooling, etc.).
  const { wrapToolsForElicitation } = await import(
    '@/mastra/mcp/elicitation'
  )
  // Cast through `unknown` — Composio tools are Mastra-shaped but typed as
  // opaque records at this boundary.
  const wrapped = wrapToolsForElicitation(
    tools as unknown as Parameters<typeof wrapToolsForElicitation>[0],
    { userId, ...options.elicit }
  )
  return wrapped as unknown as Record<string, unknown>
}
