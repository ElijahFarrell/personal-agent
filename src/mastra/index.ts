import { Mastra } from '@mastra/core'
import { LibSQLStore } from '@mastra/libsql'
import { workspace } from './workspace'

/**
 * Storage for workflow suspend/resume. On Vercel/serverless, file:./mastra.db fails
 * (read-only FS). Use Turso (libsql://...) + TURSO_AUTH_TOKEN in production.
 * Fallback: :memory: in production (no persistence), file:./mastra.db locally.
 */
function createStorage() {
  const url = process.env.MASTRA_STORAGE_URL ?? process.env.DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  const isServerless = process.env.VERCEL === '1'

  if (url) {
    return new LibSQLStore({
      id: 'mastra-storage',
      url,
      ...(authToken && { authToken }),
    })
  }

  // Serverless without remote DB: use in-memory to avoid ConnectionFailed
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
  createAllAgents,
} from './agents'
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
