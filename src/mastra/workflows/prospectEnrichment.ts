/**
 * Prospect enrichment workflow — researches a prospect from multiple sources
 * in parallel, synthesizes a dossier, and drafts a personalized outreach message.
 *
 * Persists results to Convex via the provided callback; never auto-sends.
 */
import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { generateText } from 'ai'
import { gateway } from 'ai'
import MemoryClient from 'mem0ai'
import { config } from '@/lib/config'
import * as apifyService from '@/services/apifyService'
import { search } from '@/services/searchService'
import { extractContent } from '@/services/browserService'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const enrichmentInputSchema = z.object({
  userId: z.string(),
  prospectName: z.string(),
  company: z.string().optional(),
  linkedinUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  campaignContext: z.string().optional(),
  channel: z.enum(['linkedin', 'email', 'instagram']).default('linkedin'),
})

const researchResultSchema = z.object({
  linkedinProfile: z.object({
    headline: z.string().optional(),
    recentActivity: z.string().optional(),
    connectionDegree: z.string().optional(),
  }).optional(),
  companyInfo: z.object({
    summary: z.string().optional(),
    sourceUrl: z.string().optional(),
  }).optional(),
  newsArticles: z.array(z.object({
    title: z.string(),
    url: z.string(),
    snippet: z.string(),
  })).optional(),
})

const dossierSchema = z.object({
  linkedinProfile: z.object({
    headline: z.string().optional(),
    recentActivity: z.string().optional(),
    connectionDegree: z.string().optional(),
  }).optional(),
  companyInfo: z.object({
    summary: z.string().optional(),
    sourceUrl: z.string().optional(),
  }).optional(),
  newsArticles: z.array(z.object({
    title: z.string(),
    url: z.string(),
    snippet: z.string(),
  })).optional(),
  personalizationAngles: z.array(z.string()),
})

const draftOutputSchema = z.object({
  linkedinProfile: z.object({
    headline: z.string().optional(),
    recentActivity: z.string().optional(),
    connectionDegree: z.string().optional(),
  }).optional(),
  companyInfo: z.object({
    summary: z.string().optional(),
    sourceUrl: z.string().optional(),
  }).optional(),
  newsArticles: z.array(z.object({
    title: z.string(),
    url: z.string(),
    snippet: z.string(),
  })).optional(),
  personalizationAngles: z.array(z.string()),
  draftBody: z.string(),
  draftSubject: z.string().optional(),
})

// ─── Steps ───────────────────────────────────────────────────────────────────

const researchStep = createStep({
  id: 'research-prospect',
  description: 'Gather LinkedIn profile, company info, and news in parallel',
  inputSchema: enrichmentInputSchema,
  outputSchema: researchResultSchema,
  execute: async ({ inputData }) => {
    const { linkedinUrl, websiteUrl, prospectName, company } = inputData

    const tasks: Array<Promise<void>> = []
    let linkedinProfile: z.infer<typeof researchResultSchema>['linkedinProfile']
    let companyInfo: z.infer<typeof researchResultSchema>['companyInfo']
    let newsArticles: z.infer<typeof researchResultSchema>['newsArticles']

    if (linkedinUrl) {
      tasks.push(
        (async () => {
          try {
            const [profile, posts] = await Promise.all([
              apifyService.getLinkedInProfile(linkedinUrl),
              apifyService.getLinkedInPosts(linkedinUrl, 3),
            ])
            const recentActivity = posts
              .map((p) => p.text.slice(0, 200) + (p.text.length > 200 ? '...' : ''))
              .filter(Boolean)
              .join('\n---\n')
            linkedinProfile = {
              headline: profile?.headline ?? undefined,
              recentActivity: recentActivity || undefined,
              connectionDegree: undefined,
            }
          } catch (err) {
            console.warn('[Enrichment] Apify LinkedIn research failed, trying web search fallback:', (err as Error).message)
            try {
              const results = await search(`${prospectName} site:linkedin.com`, 'fast')
              if (results.length > 0) {
                linkedinProfile = {
                  headline: results[0].content.slice(0, 200),
                  recentActivity: undefined,
                  connectionDegree: undefined,
                }
              }
            } catch { /* fallback also failed */ }
          }
        })()
      )
    }

    if (websiteUrl) {
      tasks.push(
        (async () => {
          try {
            const result = await extractContent(websiteUrl)
            if (result.success && result.content) {
              companyInfo = {
                summary: result.content.slice(0, 1500),
                sourceUrl: websiteUrl,
              }
            }
          } catch (err) {
            console.warn('[Enrichment] Company site extraction failed:', (err as Error).message)
          }
        })()
      )
    }

    const newsQuery = [prospectName, company].filter(Boolean).join(' ')
    if (newsQuery) {
      tasks.push(
        (async () => {
          try {
            const results = await search(newsQuery, 'fast')
            newsArticles = results.slice(0, 5).map((r) => ({
              title: r.title,
              url: r.url,
              snippet: r.content.slice(0, 300),
            }))
          } catch (err) {
            console.warn('[Enrichment] News search failed:', (err as Error).message)
          }
        })()
      )
    }

    await Promise.all(tasks)

    return { linkedinProfile, companyInfo, newsArticles }
  },
})

const synthesizeDossierStep = createStep({
  id: 'synthesize-dossier',
  description: 'Produce personalization angles from raw research',
  inputSchema: researchResultSchema,
  outputSchema: dossierSchema,
  execute: async ({ inputData, getInitData }) => {
    const initData = getInitData<z.infer<typeof enrichmentInputSchema>>()
    const { linkedinProfile, companyInfo, newsArticles } = inputData

    const contextParts: string[] = []
    if (linkedinProfile?.headline) contextParts.push(`Headline: ${linkedinProfile.headline}`)
    if (linkedinProfile?.recentActivity) contextParts.push(`Recent activity: ${linkedinProfile.recentActivity}`)
    if (companyInfo?.summary) contextParts.push(`Company: ${companyInfo.summary.slice(0, 500)}`)
    if (newsArticles?.length) {
      contextParts.push('News:\n' + newsArticles.map((a) => `- ${a.title}: ${a.snippet}`).join('\n'))
    }

    if (contextParts.length === 0) {
      return { ...inputData, personalizationAngles: ['No research data available — use a warm generic opener.'] }
    }

    try {
      const { text } = await generateText({
        model: gateway('anthropic/claude-haiku-4-5'),
        system: `You identify personalization angles for outreach. Given research about a prospect, output a JSON array of 3-5 short angles (1 sentence each). Each should reference something specific that could be used to start a genuine conversation. Output ONLY the JSON array.`,
        prompt: `Prospect: ${initData?.prospectName ?? 'Unknown'}\nCompany: ${initData?.company ?? 'Unknown'}\n\n${contextParts.join('\n\n')}`,
      })

      let angles: string[] = []
      try {
        angles = JSON.parse(text)
      } catch {
        angles = [text.trim()]
      }

      return { ...inputData, personalizationAngles: angles }
    } catch {
      return { ...inputData, personalizationAngles: ['Research available but angle synthesis failed — review raw data.'] }
    }
  },
})

const draftMessageStep = createStep({
  id: 'draft-message',
  description: 'Draft a personalized outreach message using brand voice and dossier',
  inputSchema: dossierSchema,
  outputSchema: draftOutputSchema,
  execute: async ({ inputData, getInitData }) => {
    const initData = getInitData<z.infer<typeof enrichmentInputSchema>>()
    const userId = initData?.userId
    const channel = initData?.channel ?? 'linkedin'
    const campaignContext = initData?.campaignContext ?? ''

    let brandVoice = ''
    if (userId && config.mem0.apiKey) {
      try {
        const mem0Client = new MemoryClient({ apiKey: config.mem0.apiKey })
        const memories = await mem0Client.search('brand voice ICP outreach tone', {
          filters: { user_id: userId },
          limit: 5,
        })
        brandVoice = (memories as Array<{ memory?: string }>)
          .map((r) => r.memory)
          .filter(Boolean)
          .join('\n')
      } catch {
        // Memory recall optional
      }
    }

    const channelRules: Record<string, string> = {
      linkedin: 'Max 300 characters. No pitch in first message. Build rapport. Reference something specific.',
      email: 'Short subject line (5-8 words). Body under 150 words. Clear but soft CTA.',
      instagram: 'Max 200 characters. Casual, genuine tone. Low-friction opener.',
    }

    const { linkedinProfile, personalizationAngles } = inputData

    const { text } = await generateText({
      model: gateway('anthropic/claude-sonnet-4-5'),
      system: `You draft personalized ${channel} outreach messages.

Rules:
- ${channelRules[channel] ?? channelRules.linkedin}
- Be specific — never generic
- Use brand voice when available
- Connection degree context: 1st = connected, 2nd/3rd = not connected, pending = request sent`,
      prompt: `${campaignContext ? `Campaign context: ${campaignContext}\n\n` : ''}Brand voice:\n${brandVoice || 'No brand voice stored — use a warm, professional tone.'}\n\nTarget: ${initData?.prospectName ?? 'Unknown'}
Headline: ${linkedinProfile?.headline ?? 'N/A'}
Connection: ${linkedinProfile?.connectionDegree ?? 'unknown'}
Personalization angles:\n${personalizationAngles.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Draft a single personalized first message. ${channel === 'email' ? 'Also output a subject line on the first line prefixed with "Subject: ".' : 'Output ONLY the message text.'}`,
    })

    let draftBody = text.trim()
    let draftSubject: string | undefined

    if (channel === 'email') {
      const lines = draftBody.split('\n')
      const subjectLine = lines.find((l) => l.toLowerCase().startsWith('subject:'))
      if (subjectLine) {
        draftSubject = subjectLine.replace(/^subject:\s*/i, '').trim()
        draftBody = lines.filter((l) => l !== subjectLine).join('\n').trim()
      }
    }

    if (channel === 'linkedin') {
      draftBody = draftBody.slice(0, 300)
    } else if (channel === 'instagram') {
      draftBody = draftBody.slice(0, 200)
    }

    return { ...inputData, draftBody, draftSubject }
  },
})

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const prospectEnrichmentWorkflow = createWorkflow({
  id: 'prospect-enrichment',
  inputSchema: enrichmentInputSchema,
  outputSchema: draftOutputSchema,
})
  .then(researchStep)
  .then(synthesizeDossierStep)
  .then(draftMessageStep)
  .commit()

// ─── Convenience runner ──────────────────────────────────────────────────────

export type EnrichmentInput = z.infer<typeof enrichmentInputSchema>
export type EnrichmentOutput = z.infer<typeof draftOutputSchema>

/**
 * Runs the enrichment pipeline as a plain async function.
 * Mirrors the workflow steps sequentially — use from API routes / dashboard
 * actions where the full Mastra runtime isn't wired up.
 */
export async function executeProspectEnrichment(
  input: EnrichmentInput
): Promise<EnrichmentOutput> {
  const { linkedinUrl, websiteUrl, prospectName, company, userId, channel = 'linkedin', campaignContext = '' } = input

  // ── Step 1: Research ───────────────────────────────────────────────────────
  const tasks: Array<Promise<void>> = []
  let linkedinProfile: z.infer<typeof researchResultSchema>['linkedinProfile']
  let companyInfo: z.infer<typeof researchResultSchema>['companyInfo']
  let newsArticles: z.infer<typeof researchResultSchema>['newsArticles']

  if (linkedinUrl) {
    tasks.push(
      (async () => {
        try {
          const [profile, posts] = await Promise.all([
            apifyService.getLinkedInProfile(linkedinUrl),
            apifyService.getLinkedInPosts(linkedinUrl, 3),
          ])
          const recentActivity = posts
            .map((p) => p.text.slice(0, 200) + (p.text.length > 200 ? '...' : ''))
            .filter(Boolean)
            .join('\n---\n')
          linkedinProfile = {
            headline: profile?.headline ?? undefined,
            recentActivity: recentActivity || undefined,
            connectionDegree: undefined,
          }
        } catch (err) {
          console.warn('[Enrichment] Apify LinkedIn failed, trying web search fallback:', (err as Error).message)
          try {
            const results = await search(`${prospectName} site:linkedin.com`, 'fast')
            if (results.length > 0) {
              linkedinProfile = { headline: results[0].content.slice(0, 200), recentActivity: undefined, connectionDegree: undefined }
            }
          } catch { /* fallback also failed */ }
        }
      })()
    )
  }

  if (websiteUrl) {
    tasks.push(
      (async () => {
        try {
          const result = await extractContent(websiteUrl)
          if (result.success && result.content) {
            companyInfo = { summary: result.content.slice(0, 1500), sourceUrl: websiteUrl }
          }
        } catch (err) { console.warn('[Enrichment] Company site extraction failed:', (err as Error).message) }
      })()
    )
  }

  const newsQuery = [prospectName, company].filter(Boolean).join(' ')
  if (newsQuery) {
    tasks.push(
      (async () => {
        try {
          const results = await search(newsQuery, 'fast')
          newsArticles = results.slice(0, 5).map((r) => ({ title: r.title, url: r.url, snippet: r.content.slice(0, 300) }))
        } catch (err) { console.warn('[Enrichment] News search failed:', (err as Error).message) }
      })()
    )
  }

  await Promise.all(tasks)

  // ── Step 2: Synthesize dossier ─────────────────────────────────────────────
  const contextParts: string[] = []
  if (linkedinProfile?.headline) contextParts.push(`Headline: ${linkedinProfile.headline}`)
  if (linkedinProfile?.recentActivity) contextParts.push(`Recent activity: ${linkedinProfile.recentActivity}`)
  if (companyInfo?.summary) contextParts.push(`Company: ${companyInfo.summary.slice(0, 500)}`)
  if (newsArticles?.length) {
    contextParts.push('News:\n' + newsArticles.map((a) => `- ${a.title}: ${a.snippet}`).join('\n'))
  }

  let personalizationAngles: string[]
  if (contextParts.length === 0) {
    personalizationAngles = ['No research data available — use a warm generic opener.']
  } else {
    try {
      const { text } = await generateText({
        model: gateway('anthropic/claude-haiku-4-5'),
        system: `You identify personalization angles for outreach. Given research about a prospect, output a JSON array of 3-5 short angles (1 sentence each). Each should reference something specific that could be used to start a genuine conversation. Output ONLY the JSON array.`,
        prompt: `Prospect: ${prospectName}\nCompany: ${company ?? 'Unknown'}\n\n${contextParts.join('\n\n')}`,
      })
      try { personalizationAngles = JSON.parse(text) } catch { personalizationAngles = [text.trim()] }
    } catch {
      personalizationAngles = ['Research available but angle synthesis failed — review raw data.']
    }
  }

  // ── Step 3: Draft message ──────────────────────────────────────────────────
  let brandVoice = ''
  if (userId && config.mem0.apiKey) {
    try {
      const mem0Client = new MemoryClient({ apiKey: config.mem0.apiKey })
      const memories = await mem0Client.search('brand voice ICP outreach tone', { filters: { user_id: userId }, limit: 5 })
      brandVoice = (memories as Array<{ memory?: string }>).map((r) => r.memory).filter(Boolean).join('\n')
    } catch { /* optional */ }
  }

  const channelRules: Record<string, string> = {
    linkedin: 'Max 300 characters. No pitch in first message. Build rapport. Reference something specific.',
    email: 'Short subject line (5-8 words). Body under 150 words. Clear but soft CTA.',
    instagram: 'Max 200 characters. Casual, genuine tone. Low-friction opener.',
  }

  const { text: draftText } = await generateText({
    model: gateway('anthropic/claude-sonnet-4-5'),
    system: `You draft personalized ${channel} outreach messages.\n\nRules:\n- ${channelRules[channel] ?? channelRules.linkedin}\n- Be specific — never generic\n- Use brand voice when available\n- Connection degree context: 1st = connected, 2nd/3rd = not connected, pending = request sent`,
    prompt: `${campaignContext ? `Campaign context: ${campaignContext}\n\n` : ''}Brand voice:\n${brandVoice || 'No brand voice stored — use a warm, professional tone.'}\n\nTarget: ${prospectName}\nHeadline: ${linkedinProfile?.headline ?? 'N/A'}\nConnection: ${linkedinProfile?.connectionDegree ?? 'unknown'}\nPersonalization angles:\n${personalizationAngles.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nDraft a single personalized first message. ${channel === 'email' ? 'Also output a subject line on the first line prefixed with "Subject: ".' : 'Output ONLY the message text.'}`,
  })

  let draftBody = draftText.trim()
  let draftSubject: string | undefined

  if (channel === 'email') {
    const lines = draftBody.split('\n')
    const subjectLine = lines.find((l) => l.toLowerCase().startsWith('subject:'))
    if (subjectLine) {
      draftSubject = subjectLine.replace(/^subject:\s*/i, '').trim()
      draftBody = lines.filter((l) => l !== subjectLine).join('\n').trim()
    }
  }

  if (channel === 'linkedin') draftBody = draftBody.slice(0, 300)
  else if (channel === 'instagram') draftBody = draftBody.slice(0, 200)

  return { linkedinProfile, companyInfo, newsArticles, personalizationAngles, draftBody, draftSubject }
}
