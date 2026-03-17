/**
 * Composio client for Apollo and Outlook integrations.
 * Uses user ID (Clerk) as the Composio entity ID for connected accounts.
 */
import { Composio } from '@composio/core'
import { config } from '@/lib/config'

const COMPOSIO_TOOLKITS = ['APOLLO', 'OUTLOOK'] as const
export type ComposioToolkit = (typeof COMPOSIO_TOOLKITS)[number]

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
 * Use this for authorize() and toolkits().
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
  toolkit: ComposioToolkit,
  callbackUrl?: string
): Promise<string> {
  const session = await createComposioSession(userId)
  const connectionRequest = await session.authorize(toolkit, {
    callbackUrl,
  })
  const url = connectionRequest.redirectUrl
  if (!url) throw new Error('Composio authorize did not return a redirect URL')
  return url
}

/**
 * Returns connection status for Apollo and Outlook.
 */
export async function getComposioConnectionStatus(
  userId: string
): Promise<Record<ComposioToolkit, boolean>> {
  const session = await createComposioSession(userId)
  const toolkits = await session.toolkits()
  const status: Record<string, boolean> = {
    APOLLO: false,
    OUTLOOK: false,
  }
  for (const item of toolkits.items) {
    const slug = item.slug?.toUpperCase()
    if (slug === 'APOLLO' || slug === 'OUTLOOK') {
      status[slug] = !!item.connection?.connectedAccount
    }
  }
  return status as Record<ComposioToolkit, boolean>
}
