import { z } from 'zod'

/** Supported SearchAPI ad-library style engines (Composio SEARCH_API `engine` param). */
export const SEARCH_API_ENGINE_IDS = [
  'meta_ad_library',
  'linkedin_ad_library',
  'tiktok_ads_library',
  'google_ads_transparency_center',
] as const

export const SearchApiEngineSchema = z.enum(SEARCH_API_ENGINE_IDS)
export type SearchApiEngine = z.infer<typeof SearchApiEngineSchema>

export const AdsPlatformSchema = z.enum([
  'meta',
  'linkedin',
  'tiktok',
  'google',
])
export type AdsPlatform = z.infer<typeof AdsPlatformSchema>

/** Map high-level platform picks to default engines. */
export const PLATFORM_DEFAULT_ENGINE: Record<AdsPlatform, SearchApiEngine> = {
  meta: 'meta_ad_library',
  linkedin: 'linkedin_ad_library',
  tiktok: 'tiktok_ads_library',
  google: 'google_ads_transparency_center',
}

export const AdsPipelineInputSchema = z.object({
  query: z.string().min(1, 'query is required'),
  platforms: z.array(AdsPlatformSchema).min(1, 'at least one platform'),
  focusArea: z.string().optional(),
  businessProfile: z.string().optional(),
})
export type AdsPipelineInput = z.infer<typeof AdsPipelineInputSchema>

export const SearchApiCacheRefSchema = z.object({
  engine: z.string(),
  searchId: z.string(),
  ok: z.boolean(),
  error: z.string().optional(),
})
export type SearchApiCacheRef = z.infer<typeof SearchApiCacheRefSchema>

export const AdsScrapeResultSchema = z.object({
  refs: z.array(SearchApiCacheRefSchema),
  requestedEngines: z.array(z.string()),
  completedEngines: z.array(z.string()),
})
export type AdsScrapeResult = z.infer<typeof AdsScrapeResultSchema>

export const AdAnalysisSchema = z.object({
  markdown: z.string(),
})
export type AdAnalysis = z.infer<typeof AdAnalysisSchema>

export const CampaignBriefSchema = z.object({
  markdown: z.string(),
  structured: z.record(z.unknown()).optional(),
})
export type CampaignBrief = z.infer<typeof CampaignBriefSchema>

export const AdsPipelineRunOutputSchema = z.object({
  scrape: AdsScrapeResultSchema,
  analysis: AdAnalysisSchema,
  campaign: CampaignBriefSchema,
})
export type AdsPipelineRunOutput = z.infer<typeof AdsPipelineRunOutputSchema>
