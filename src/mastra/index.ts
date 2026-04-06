import { Mastra } from '@mastra/core'
import { MastraCompositeStore } from '@mastra/core/storage'
import { LibSQLStore } from '@mastra/libsql'
import { workspace } from './workspace'
import { ConvexWorkflowsStorage } from './storage/convexWorkflowsStorage'
import { FallbackWorkflowsStorage } from './storage/fallbackWorkflowsStorage'

/**
 * Storage for workflow suspend/resume.
 * - When NEXT_PUBLIC_CONVEX_URL is set: use Convex with :memory: fallback on error.
 * - Else when MASTRA_STORAGE_URL/Turso: use LibSQL remote.
 * - Else on serverless: :memory: (no persistence).
 * - Else locally: file:./mastra.db.
 */
function createStorage() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const tursoUrl = process.env.MASTRA_STORAGE_URL ?? process.env.DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  const isServerless = process.env.VERCEL === '1'

  if (convexUrl) {
    return new MastraCompositeStore({
      id: 'mastra-storage',
      domains: {
        workflows: new FallbackWorkflowsStorage(new ConvexWorkflowsStorage()),
      },
    })
  }

  if (tursoUrl) {
    return new LibSQLStore({
      id: 'mastra-storage',
      url: tursoUrl,
      ...(authToken && { authToken }),
    })
  }

  if (isServerless) {
    return new LibSQLStore({
      id: 'mastra-storage',
      url: ':memory:',
    })
  }

  return new LibSQLStore({
    id: 'mastra-storage',
    url: 'file:./mastra.db',
  })
}

const storage = createStorage()

/**
 * The Mastra instance is the registry for all agents and workflows.
 * Agents are created per-user via factories (for memory isolation),
 * so we don't register them here directly — they're instantiated in route handlers.
 *
 * The workspace provides:
 * - Skill discovery from /skills via SKILL.md files (Mastra Workspace Skills)
 * - BM25 + vector (Qdrant) hybrid search over skill and context content
 * - Filesystem access for skill references, scripts, and assets
 *
 * Storage (when configured) enables workflow suspend/resume persistence.
 */
export const mastra = new Mastra({ workspace, storage })

export {
  createOrchestratorAgent,
  createEmailAgent,
  createResearchAgent,
  createDeepResearchAgent,
  createCalendarAgent,
  createLinkedInAgent,
  createContentAgent,
  createInstagramAgent,
  createBrowserAgent,
  createCrmAgent,
  createProjectAgent,
  createMessagingAgent,
  createDocsAgent,
  createRealEstateAgent,
  createFinanceAgent,
  createMarketingAgent,
  createMetaAdsAgent,
  createAdsScraperAgent,
  createAdAnalyzerAgent,
  createCampaignBuilderAgent,
  createAllAgents,
} from './agents'
/** Re-exported from file to satisfy Turbopack static analysis for API routes. */
export { createAuditAgent } from './agents/auditAgent'
export { createMarketingChatAgent } from './agents/marketingChatAgent'
export { createVoice } from './voice'
export { executeMorningBrief, morningBriefWorkflow } from './workflows/morningBrief'
export {
  executeOutreachCampaign,
  type OutreachTarget,
  type OutreachCampaignInput,
  type OutreachCampaignResult,
} from './workflows/outreachCampaign'
export {
  executeProspectEnrichment,
  prospectEnrichmentWorkflow,
  type EnrichmentInput,
  type EnrichmentOutput,
} from './workflows/prospectEnrichment'
export {
  adsIntelligenceWorkflow,
  executeAdsIntelligencePipeline,
  type AdsIntelligenceWorkflowInput,
  type AdsIntelligenceWorkflowOutput,
} from './workflows/adsIntelligencePipeline'
