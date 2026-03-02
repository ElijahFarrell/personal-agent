/**
 * Outreach campaign workflow — runs a multi-step personalized outreach campaign.
 * Practical implementation using plain async functions (not full Mastra workflow DSL).
 * Returns drafts for batch approval; never auto-sends.
 */
import { generateText } from 'ai'
import { gateway } from 'ai'
import MemoryClient from 'mem0ai'
import { config } from '@/lib/config'
import * as linkedinService from '@/services/linkedinService'
import { search } from '@/services/searchService'

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

/**
 * Execute an outreach campaign. For each target: research profile, draft message.
 * Returns all drafts for batch approval. Sending happens in a separate step.
 */
export async function executeOutreachCampaign(
  input: OutreachCampaignInput
): Promise<OutreachCampaignResult> {
  const { userId, targets, campaignContext } = input
  const drafts: Array<{ profileUrl: string; message: string; name?: string }> = []
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
      const profile = await linkedinService.getProfile(target.profileUrl)
      const connectionDegree = await linkedinService.getConnectionDegree(
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
          // Web search optional
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

  return {
    sent: 0,
    drafted: drafts.length,
    failed,
    drafts,
  }
}
