/**
 * Outlook email sending via Composio.
 * Uses Composio's OUTLOOK_SEND_EMAIL tool with the user's connected account.
 */
import { config } from '@/lib/config'
import { executeComposioTool } from '@/lib/composio'

export interface SendOutlookEmailParams {
  to: string
  subject: string
  body: string
}

/**
 * Sends an email via the user's connected Outlook account.
 * Requires user to have connected Outlook in Integrations (Composio).
 */
export async function sendOutlookEmail(
  userId: string,
  params: SendOutlookEmailParams
): Promise<void> {
  if (!config.composio.apiKey) {
    throw new Error('COMPOSIO_API_KEY is not configured')
  }

  const result = await executeComposioTool(userId, 'OUTLOOK_SEND_EMAIL', {
    to: params.to,
    subject: params.subject,
    body: params.body,
  })

  if (!result.successful && result.error) {
    throw new Error(result.error)
  }
}
