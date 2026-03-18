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
  const toolkits = await session.toolkits()

  const status: Record<string, boolean> = Object.fromEntries(
    COMPOSIO_PROVIDERS.map((p) => [p, false])
  )

  for (const item of toolkits.items) {
    const provider = getProviderForToolkit(item.slug ?? '')
    if (provider && item.connection?.connectedAccount) {
      status[provider] = true
    }
  }

  return status as Record<ComposioProvider, boolean>
}

/**
 * Executes a Composio tool directly. Use for service-layer calls (e.g. gmail send).
 */
export async function executeComposioTool<T = unknown>(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ successful: boolean; data?: T; error?: string }> {
  const composio = getComposio()
  const result = await composio.tools.execute(toolName, {
    userId,
    arguments: args,
  })
  return {
    successful: !!result.successful,
    data: result.data as T | undefined,
    error: result.error ?? undefined,
  }
}

/**
 * Returns Composio tools for the given providers (toolkits).
 * Use with Mastra agents. Only includes toolkits the user has connected.
 */
export async function getComposioToolsForProviders(
  userId: string,
  providers: ComposioProvider[]
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

  const tools = await session.tools()
  return (tools ?? {}) as Record<string, unknown>
}
