import { MCPClient } from '@mastra/mcp'
import { findConnectionId } from '@/services/nangoService'
import { config } from '@/lib/config'
import type { IntegrationProvider } from '@/types'

const NANGO_MCP_URL = 'https://api.nango.dev/mcp'

/**
 * Creates an MCPClient configured for Nango's hosted MCP server.
 * One server entry per provider; each uses the user's connection for that integration.
 *
 * @param userId - End user ID (used to resolve Nango connection IDs)
 * @param providers - Integration provider IDs (e.g. hubspot, salesforce)
 * @returns MCPClient instance, or null if no secret key or no connections resolved
 */
export async function createNangoMCPClient(
  userId: string,
  providers: string[]
): Promise<MCPClient | null> {
  if (!config.nango.secretKey || providers.length === 0) return null

  const servers: Record<string, { url: URL; requestInit: RequestInit }> = {}

  for (const provider of providers) {
    const connectionId = await findConnectionId(provider as IntegrationProvider, userId)
    if (!connectionId) continue

    servers[provider] = {
      url: new URL(NANGO_MCP_URL),
      requestInit: {
        headers: {
          Authorization: `Bearer ${config.nango.secretKey}`,
          'connection-id': connectionId,
          'provider-config-key': provider,
        },
      },
    }
  }

  if (Object.keys(servers).length === 0) return null

  return new MCPClient({
    id: `nango-${userId}-${providers.sort().join('-')}`,
    servers,
    timeout: 30000,
  })
}

/**
 * Returns Nango MCP toolsets for the given user and providers.
 * Use with agent.generate() or agent.stream() via the toolsets option.
 *
 * @param userId - End user ID
 * @param providers - Integration provider IDs the user has connected
 * @returns Record of server name to tools, or empty object if none available
 */
export async function getNangoMCPToolsets(
  userId: string,
  providers: string[]
): Promise<Record<string, Record<string, unknown>>> {
  const client = await createNangoMCPClient(userId, providers)
  if (!client) return {}

  try {
    const toolsets = await client.listToolsets()
    return toolsets as unknown as Record<string, Record<string, unknown>>
  } catch {
    return {}
  }
}
