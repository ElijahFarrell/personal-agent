import { Mastra } from '@mastra/core'
import { MastraCompositeStore } from '@mastra/core/storage'
import { LibSQLStore } from '@mastra/libsql'
import {
  Observability,
  DefaultExporter,
  SamplingStrategyType,
  SensitiveDataFilter,
} from '@mastra/observability'
import { BraintrustExporter } from '@mastra/braintrust'
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
 * Observability: Braintrust + sensitive-data filter.
 * Multi-config sampling: always for orchestrator + long-running tools, probability 0.1 elsewhere.
 * The orchestrator-vs-other decision is encoded via tracingOptions.tags and the `configSelector`.
 *
 * Vendor: Braintrust (see plan phase 0). Returning `undefined` from the selector falls back to the
 * default Observability instance.
 */
function createObservability(): Observability | undefined {
  const braintrustKey = process.env.BRAINTRUST_API_KEY
  if (!braintrustKey) return undefined

  const sharedProcessors = [
    new SensitiveDataFilter({
      sensitiveFields: [
        'password',
        'token',
        'secret',
        'apiKey',
        'authorization',
        'bearer',
        'email',
        'phone',
        'phoneNumber',
        'ssn',
      ],
      redactionStyle: 'partial',
    }),
  ]
  const projectName = process.env.BRAINTRUST_PROJECT ?? 'personal-agent'
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development'

  return new Observability({
    configs: {
      critical: {
        serviceName: `${projectName}-critical`,
        sampling: { type: SamplingStrategyType.ALWAYS },
        exporters: [
          new DefaultExporter(),
          new BraintrustExporter({
            apiKey: braintrustKey,
            projectName,
          }),
        ],
        spanOutputProcessors: sharedProcessors,
        requestContextKeys: ['tenantId', 'userId', 'threadId', 'runId'],
      },
      sampled: {
        serviceName: `${projectName}-sampled`,
        sampling: { type: SamplingStrategyType.RATIO, probability: 0.1 },
        exporters: [
          new DefaultExporter(),
          new BraintrustExporter({
            apiKey: braintrustKey,
            projectName,
          }),
        ],
        spanOutputProcessors: sharedProcessors,
        requestContextKeys: ['tenantId', 'userId', 'threadId', 'runId'],
      },
    },
    configSelector: (options, _availableTracers) => {
      const profile = options?.requestContext?.get?.('traceProfile') as
        | string
        | undefined
      if (profile === 'critical') return 'critical'
      if (profile === 'sampled') return 'sampled'
      const runId = options?.requestContext?.get?.('runId')
      return runId ? 'critical' : 'sampled'
    },
  })
}

const observability = createObservability()

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
export const mastra = new Mastra({
  workspace,
  storage,
  ...(observability ? { observability } : {}),
})

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
  outreachCampaignWorkflow,
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
