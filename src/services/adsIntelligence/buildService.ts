import { generateText } from 'ai'
import { AgentModels } from '@/constants/models'
import { gatewayReportingProviderOptions } from '@/lib/aiGatewayReporting'
import type { AdAnalysis } from './contracts'
import type { CampaignBrief } from './contracts'

export async function buildCampaignBrief(
  analysis: AdAnalysis,
  businessProfile?: string,
  clerkUserId?: string
): Promise<CampaignBrief> {
  const profile = businessProfile?.trim() ?? 'Not provided — use sensible defaults.'

  const { text } = await generateText({
    model: AgentModels.content(),
    system: `You are a performance marketing strategist. Given a competitive ad analysis, produce a concrete campaign brief: objective, audience hypothesis, core message, 3–5 creative angles, suggested channels (Meta / LinkedIn / TikTok / Google as relevant), and success metrics. Output markdown with clear sections.`,
    prompt: `Business context:\n${profile}\n\n---\n\nCompetitive analysis:\n${analysis.markdown}`,
    ...gatewayReportingProviderOptions({
      user: clerkUserId ?? 'system:ads-pipeline',
      tags: ['surface:ads-intelligence', 'flow:campaign-brief'],
    }),
  })

  return { markdown: text.trim() }
}
