/**
 * Outreach campaign workflow — runs a multi-step personalized outreach
 * campaign. Drafts messages per target, pauses for batch approval, and
 * returns the approved drafts. Actual sending happens downstream (via
 * Lemlist / LinkedIn tools) and is always gated by a separate approval.
 *
 * Exposes:
 *   - `outreachCampaignWorkflow`   → full Mastra workflow with suspend/resume
 *   - `executeOutreachCampaign`    → plain async runner used by `/api/outreach`
 */
import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { generateText } from 'ai'
import { gateway } from 'ai'
import MemoryClient from 'mem0ai'
import { config } from '@/lib/config'
import { gatewayReportingProviderOptions } from '@/lib/aiGatewayReporting'
import * as linkedinService from '@/services/linkedinService'
import { search } from '@/services/searchService'
import { createApprovalStep } from './approvalStep'

// ─── Public types (kept stable for legacy importers) ────────────────────────

export interface OutreachTarget {
  profileUrl: string
  context?: string
}

export interface OutreachCampaignInput {
  userId: string
  targets: OutreachTarget[]
  campaignContext: string
}

export interface OutreachCampaignResult {
  sent: number
  drafted: number
  failed: number
  drafts: Array<{ profileUrl: string; message: string; name?: string }>
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const targetSchema = z.object({
  profileUrl: z.string(),
  context: z.string().optional(),
})

const workflowInputSchema = z.object({
  userId: z.string(),
  targets: z.array(targetSchema).min(1),
  campaignContext: z.string(),
})

const draftSchema = z.object({
  profileUrl: z.string(),
  message: z.string(),
  name: z.string().optional(),
})

const draftsOutputSchema = z.object({
  drafted: z.number(),
  failed: z.number(),
  drafts: z.array(draftSchema),
})

const workflowOutputSchema = draftsOutputSchema.extend({
  sent: z.number(),
})

// ─── Shared drafting logic ──────────────────────────────────────────────────

async function draftMessagesForTargets(
  input: OutreachCampaignInput
): Promise<{ drafts: OutreachCampaignResult['drafts']; failed: number }> {
  const { userId, targets, campaignContext } = input
  const drafts: OutreachCampaignResult['drafts'] = []
  let failed = 0

  const mem0Client = config.mem0.apiKey
    ? new MemoryClient({ apiKey: config.mem0.apiKey })
    : null

  const brandVoiceMemories = mem0Client
    ? await mem0Client.search('brand voice ICP outreach tone', {
        filters: { user_id: userId },
        limit: 5,
      })
    : []
  const brandVoice = (brandVoiceMemories as Array<{ memory?: string }>)
    .map((r) => r.memory)
    .filter(Boolean)
    .join('\n')

  for (const target of targets) {
    try {
      const profile = await linkedinService.getProfile(userId, target.profileUrl)
      const connectionDegree = await linkedinService.getConnectionDegree(
        userId,
        target.profileUrl
      )

      let webContext = ''
      if (profile.name || profile.headline) {
        const searchQuery = `${profile.name} ${profile.headline ?? ''}`.trim()
        try {
          const webResults = await search(searchQuery, 'fast')
          webContext = webResults
            .slice(0, 2)
            .map((r) => `${r.title}: ${r.content.slice(0, 300)}`)
            .join('\n\n')
        } catch {
          // Web search is best-effort context.
        }
      }

      const { text } = await generateText({
        model: gateway('anthropic/claude-sonnet-4-5'),
        system: `You draft personalized LinkedIn outreach messages.

Rules:
- First messages: max 300 characters, no pitch, build rapport
- Reference the person's actual content, experience, or interests
- Be specific — never generic
- Use brand voice from memory when available
- Connection degree: 1st = connected, 2nd/3rd = not connected, pending = request sent`,
        prompt: `Campaign context: ${campaignContext}

Brand voice / ICP from memory:
${brandVoice || 'No brand voice stored — use a warm, professional tone.'}

Target: ${profile.name}
Headline: ${profile.headline ?? 'N/A'}
Connection: ${connectionDegree}
Recent activity: ${profile.recentActivity ?? 'N/A'}
${target.context ? `Extra context: ${target.context}` : ''}
${webContext ? `Web context: ${webContext}` : ''}

Draft a single personalized first message (max 300 chars). Output ONLY the message text, no JSON.`,
        ...gatewayReportingProviderOptions({
          user: userId,
          tags: ['surface:outreach', 'workflow:outreach-campaign'],
        }),
      })

      const message = text.trim().slice(0, 300)
      drafts.push({
        profileUrl: target.profileUrl,
        message,
        name: profile.name,
      })
    } catch (error) {
      failed++
      console.error(`[Outreach] Failed for ${target.profileUrl}:`, error)
    }
  }

  return { drafts, failed }
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const draftStep = createStep({
  id: 'outreach-draft',
  description: 'Research each target and draft a personalized first message',
  inputSchema: workflowInputSchema,
  outputSchema: draftsOutputSchema,
  execute: async ({ inputData }) => {
    const { drafts, failed } = await draftMessagesForTargets(inputData)
    return { drafted: drafts.length, failed, drafts }
  },
})

const approveDraftsStep = createApprovalStep({
  id: 'outreach-approve-drafts',
  description:
    'Batch approval of outreach drafts. The workflow suspends here until a reviewer confirms.',
  payloadSchema: draftsOutputSchema,
})

const finalizeStep = createStep({
  id: 'outreach-finalize',
  description:
    'Mark the approved drafts as ready for downstream sending. Never sends here.',
  inputSchema: draftsOutputSchema,
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => ({ ...inputData, sent: 0 }),
})

// ─── Workflow ───────────────────────────────────────────────────────────────

export const outreachCampaignWorkflow = createWorkflow({
  id: 'outreach-campaign',
  description:
    'Draft personalized outreach per target, pause for human approval, then hand off approved drafts for sending.',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
})
  .then(draftStep)
  .then(approveDraftsStep)
  .then(finalizeStep)
  .commit()

// ─── Plain async runner (used by /api/outreach) ─────────────────────────────

/**
 * Execute an outreach campaign outside the workflow runtime. Returns all
 * drafts for batch approval. Sending happens in a separate step.
 */
export async function executeOutreachCampaign(
  input: OutreachCampaignInput
): Promise<OutreachCampaignResult> {
  const { drafts, failed } = await draftMessagesForTargets(input)
  return {
    sent: 0,
    drafted: drafts.length,
    failed,
    drafts,
  }
}
