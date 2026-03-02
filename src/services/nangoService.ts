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
 * Fetches a fresh access token for a user+provider connection.
 * Nango handles token refresh transparently when the token is expired.
 *
 * @param provider - Nango integration key (e.g. 'gmail', 'google-calendar')
 * @param userId - Connection ID (typically the user's ID in your system)
 * @returns Credentials with access token, or null if connection not found
 */
export async function getConnection(
  provider: IntegrationProvider,
  userId: string
): Promise<NangoConnectionCredentials | null> {
  if (!config.nango.secretKey) {
    throw new Error('Nango secret key is not configured')
  }

  try {
    const connection = await nango.getConnection(provider, userId)
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
 * Use when the user explicitly disconnects an integration.
 *
 * @param provider - Integration key to disconnect
 * @param userId - Connection ID (user ID)
 */
export async function deleteConnection(
  provider: IntegrationProvider,
  userId: string
): Promise<void> {
  if (!config.nango.secretKey) {
    throw new Error('Nango secret key is not configured')
  }

  await nango.deleteConnection(provider, userId)
}
