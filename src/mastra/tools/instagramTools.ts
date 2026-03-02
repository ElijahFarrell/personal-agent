/**
 * Mastra tools for Instagram operations.
 */
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  sendDM,
  verifyWebhookSignature,
} from '@/services/instagramService'

/**
 * Send an Instagram DM. Only call after showing the message draft and receiving explicit confirmation.
 */
export function createInstagramSendDMTool(_userId: string) {
  return createTool({
    id: 'instagram-send-dm',
    description:
      'Send a DM on Instagram. ONLY call after showing the user the message draft ' +
      'and receiving explicit confirmation. If confirmed is false, returns the draft for review.',
    inputSchema: z.object({
      recipientId: z.string().describe('Instagram-scoped ID of the recipient'),
      message: z.string().describe('The message to send'),
      confirmed: z
        .boolean()
        .describe(
          'Must be true to send. If false, returns draft for user review.'
        ),
    }),
    execute: async (input) => {
      if (!input.confirmed) {
        return {
          draft: true,
          recipientId: input.recipientId,
          message: input.message,
          instruction:
            'Draft ready for review. Please confirm if you want to send this message.',
        }
      }

      try {
        const result = await sendDM(input.recipientId, input.message)
        return { success: true, messageId: result.messageId, recipientId: result.recipientId }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send DM'
        throw new Error(message)
      }
    },
  })
}

/**
 * Verify an incoming webhook request is legitimate.
 * Uses X-Hub-Signature-256 and config.meta.appSecret.
 */
export const instagramWebhookVerifyTool = createTool({
  id: 'instagram-webhook-verify',
  description:
    'Verify that an incoming Instagram webhook request is legitimate by checking ' +
    'the X-Hub-Signature-256 header against the app secret.',
  inputSchema: z.object({
    payload: z.string().describe('Raw request body as received'),
    signature: z.string().describe('X-Hub-Signature-256 header value'),
  }),
  execute: async (input) => {
    const valid = verifyWebhookSignature(input.payload, input.signature)
    return { valid }
  },
})
