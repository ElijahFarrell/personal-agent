import { Nango } from '@nangohq/node'
import type { IntegrationProvider } from '@/types'
import { config } from '@/lib/config'

/** Nango connection credentials with access token for OAuth2 providers. */
export interface NangoConnectionCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

/** Connect session token for frontend OAuth flow. */
export interface ConnectSessionResult {
  token: string
  connectLink: string
  expiresAt: string
}

const nango = new Nango({
  secretKey: config.nango.secretKey,
})

/**
 * Finds the real Nango connectionId for an end user + provider combo.
 * Nango Connect sessions auto-assign connectionIds that may differ from
 * the end_user.id we pass in createConnectSession.
 */
export async function findConnectionId(
  provider: IntegrationProvider,
  endUserId: string
): Promise<string | null> {
  if (!config.nango.secretKey) return null

  try {
    const response = await nango.listConnections({
      userId: endUserId,
      integrationId: provider,
    })
    const match = response.connections.find(
      (c) => c.provider_config_key === provider,
    )
    return match?.connection_id ?? null
  } catch {
    return null
  }
}

function extractCredentials(
  connection: { credentials?: unknown },
): NangoConnectionCredentials | null {
  if (!connection?.credentials) return null

  const creds = connection.credentials as {
    type?: string
    access_token?: string
    refresh_token?: string
    expires_at?: Date
  }

  const accessToken = creds.access_token
  if (!accessToken || typeof accessToken !== 'string') return null

  return {
    accessToken,
    refreshToken: creds.refresh_token,
    expiresAt: creds.expires_at,
  }
}

/**
 * Fetches a fresh access token for a user+provider connection.
 * Tries direct connectionId lookup first (userId as connectionId),
 * then falls back to discovering the real connectionId via listConnections.
 */
export async function getConnection(
  provider: IntegrationProvider,
  userId: string
): Promise<NangoConnectionCredentials | null> {
  if (!config.nango.secretKey) {
    throw new Error('Nango secret key is not configured')
  }

  // Try direct lookup (works when connectionId === userId)
  try {
    const connection = await nango.getConnection(provider, userId)
    const creds = extractCredentials(connection)
    if (creds) return creds
  } catch {
    // fall through to discovery
  }

  // Discover the real connectionId via end_user_id
  const realConnectionId = await findConnectionId(provider, userId)
  if (!realConnectionId) return null

  try {
    const connection = await nango.getConnection(provider, realConnectionId)
    return extractCredentials(connection)
  } catch {
    return null
  }
}

/**
 * Creates a Nango connect session for the frontend OAuth flow.
 * The returned token is used to open the Nango Connect UI for users to authorize integrations.
 *
 * Note: `allowed_integrations` is intentionally omitted — Nango will allow any integration
 * configured in the dashboard. Passing IDs that don't exist in the dashboard causes a 400.
 *
 * @param userId - End user ID (used as connection ID when OAuth completes)
 * @param orgId - Organization ID for multi-tenant context
 * @returns Session token and connect link for redirect
 */
export async function createConnectSession(
  userId: string,
  orgId: string,
): Promise<ConnectSessionResult> {
  if (!config.nango.secretKey) {
    throw new Error('Nango secret key is not configured')
  }

  try {
    const response = await nango.createConnectSession({
      end_user: { id: userId },
      organization: { id: orgId },
    })

    const data = response.data
    if (!data?.token || !data?.connect_link || !data?.expires_at) {
      throw new Error('Invalid connect session response from Nango')
    }

    return {
      token: data.token,
      connectLink: data.connect_link,
      expiresAt: data.expires_at,
    }
  } catch (err) {
    // Surface the Nango API error body for easier debugging
    const axiosBody = (err as { response?: { data?: unknown } })?.response?.data
    if (axiosBody) {
      throw new Error(`Nango API error: ${JSON.stringify(axiosBody)}`)
    }
    throw err
  }
}

/**
 * Removes a user's connection for a given provider.
 * Resolves the real connectionId if needed before deleting.
 */
export async function deleteConnection(
  provider: IntegrationProvider,
  userId: string
): Promise<void> {
  if (!config.nango.secretKey) {
    throw new Error('Nango secret key is not configured')
  }

  try {
    await nango.deleteConnection(provider, userId)
    return
  } catch {
    // connectionId might not be userId — discover it
  }

  const realConnectionId = await findConnectionId(provider, userId)
  if (realConnectionId) {
    await nango.deleteConnection(provider, realConnectionId)
  }
}
