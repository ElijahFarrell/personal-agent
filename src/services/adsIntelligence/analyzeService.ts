import { generateText } from 'ai'
import { gateway } from 'ai'
import { AgentModels } from '@/constants/models'
import { gatewayReportingProviderOptions } from '@/lib/aiGatewayReporting'
import { getCachedSearchJson } from './searchApiCacheService'
import type { AdAnalysis, AdsScrapeResult } from './contracts'

function trimJsonForPrompt(raw: unknown, maxChars: number): string {
  try {
    const s = JSON.stringify(raw)
    if (s.length <= maxChars) return s
    return `${s.slice(0, maxChars)}… [truncated]`
  } catch {
    return '[unserializable payload]'
  }
}

/**
 * Loads cached search payloads for successful refs and produces a competitive analysis.
 */
export async function analyzeAdsFromScrape(
  clerkUserId: string,
  scrape: AdsScrapeResult,
  focusArea?: string
): Promise<AdAnalysis> {
  const payloads: string[] = []
  for (const ref of scrape.refs) {
    if (!ref.ok || !ref.searchId) continue
    const cached = await getCachedSearchJson(clerkUserId, ref.searchId)
    if (!cached.ok) {
      payloads.push(`## ${ref.engine}\nError loading cache: ${cached.error}`)
      continue
    }
    payloads.push(
      `## ${ref.engine}\n${trimJsonForPrompt(cached.data, 24_000)}`
    )
  }

  const context = payloads.join('\n\n---\n\n')
  const focus = focusArea?.trim() ? `\nFocus: ${focusArea.trim()}` : ''

  const { text } = await generateText({
    model: AgentModels.content(),
    system: `You are a competitive advertising analyst. Synthesize ad-library search results into clear, actionable insights: themes, messaging patterns, creative formats, targeting signals (if visible), and gaps vs typical competitors. Use markdown with headings and bullet points. If data is sparse, say so and infer cautiously.${focus}`,
    prompt: `Analyze the following competitive ad research data:\n\n${context || 'No data retrieved.'}`,
    ...gatewayReportingProviderOptions({
      user: clerkUserId,
      tags: ['surface:ads-intelligence', 'flow:analyze-ads'],
    }),
  })

  return { markdown: text.trim() }
}
