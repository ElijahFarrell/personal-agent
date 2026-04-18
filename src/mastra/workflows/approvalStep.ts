import { createStep } from '@mastra/core/workflows'
import { z } from 'zod'

/**
 * Generic human-in-the-loop approval gate. Used inside Mastra workflows to
 * pause execution (via `suspend`) until the UI (or an orchestrator resume
 * call) provides an `approved` verdict. Keeps our workflows consistent:
 * every destructive step — send email, push a Lemlist sequence, import
 * prospects, publish a brief — sits behind one of these.
 *
 * Example:
 *
 * ```ts
 * const approveDrafts = createApprovalStep({
 *   id: 'approve-drafts',
 *   description: 'Approve generated outreach drafts before sending.',
 *   payloadSchema: draftsSchema,
 * })
 * ```
 *
 * Resume with `{ approved: true }` to continue, or `{ approved: false, note }`
 * to abort with a structured error.
 */
export function createApprovalStep<TPayload extends z.ZodTypeAny>(opts: {
  id: string
  description: string
  payloadSchema: TPayload
}) {
  const resumeSchema = z.object({
    approved: z.boolean(),
    note: z.string().optional(),
  })

  return createStep({
    id: opts.id,
    description: opts.description,
    inputSchema: opts.payloadSchema,
    outputSchema: opts.payloadSchema,
    suspendSchema: z.object({ preview: opts.payloadSchema }),
    resumeSchema,
    execute: async ({ inputData, suspend, resumeData }) => {
      if (!resumeData) {
        await suspend({ preview: inputData })
        return inputData
      }
      const parsed = resumeSchema.parse(resumeData)
      if (!parsed.approved) {
        throw new Error(
          parsed.note ? `Approval denied: ${parsed.note}` : 'Approval denied.'
        )
      }
      return inputData
    },
  })
}
