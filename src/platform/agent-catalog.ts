/**
 * Single source for agent id ↔ orchestrator tool id ↔ createAgentTools object key.
 * Keep in sync when adding agents.
 */
import type { AgentId } from '@/constants/agents'
import { AGENT_REGISTRY, AGENT_BY_TOOL_ID } from '@/constants/agents'
import { createEmailAgent } from '@/mastra/agents/emailAgent'
import { createResearchAgent } from '@/mastra/agents/researchAgent'
import { createCalendarAgent } from '@/mastra/agents/calendarAgent'
import { createLinkedInAgent } from '@/mastra/agents/linkedinAgent'
import { createContentAgent } from '@/mastra/agents/contentAgent'
import { createInstagramAgent } from '@/mastra/agents/instagramAgent'
import { createBrowserAgent } from '@/mastra/agents/browserAgent'
import { createMessagingAgent } from '@/mastra/agents/messagingAgent'
import { createDocsAgent } from '@/mastra/agents/docsAgent'
import { createCrmAgent } from '@/mastra/agents/crmAgent'
import { createProjectAgent } from '@/mastra/agents/projectAgent'
import { createRealEstateAgent } from '@/mastra/agents/realEstateAgent'
import { createFinanceAgent } from '@/mastra/agents/financeAgent'
import { createMarketingAgent } from '@/mastra/agents/marketingAgent'
import { createMetaAdsAgent } from '@/mastra/agents/metaAdsAgent'
import { createAdsScraperAgent } from '@/mastra/agents/adsScraperAgent'
import { createAdAnalyzerAgent } from '@/mastra/agents/adAnalyzerAgent'
import { createCampaignBuilderAgent } from '@/mastra/agents/campaignBuilderAgent'
import { createSDRAgent } from '@/mastra/agents/sdrAgent'

/** Mastral tool object key returned by createAgentTools (camelCase). */
export type AgentToolsDelegateKey =
  | 'emailAgent'
  | 'researchAgent'
  | 'calendarAgent'
  | 'linkedinAgent'
  | 'contentAgent'
  | 'instagramAgent'
  | 'browserAgent'
  | 'messagingAgent'
  | 'docsAgent'
  | 'crmAgent'
  | 'projectAgent'
  | 'realEstateAgent'
  | 'financeAgent'
  | 'marketingAgent'
  | 'metaAdsAgent'
  | 'adsScraperAgent'
  | 'adAnalyzerAgent'
  | 'campaignBuilderAgent'
  | 'sdrAgent'

export interface AgentCatalogEntry {
  id: AgentId
  toolId: string
  toolsObjectKey: AgentToolsDelegateKey
}

const TOOLS_KEY_BY_ID: Record<AgentId, AgentToolsDelegateKey> = {
  email: 'emailAgent',
  research: 'researchAgent',
  calendar: 'calendarAgent',
  linkedin: 'linkedinAgent',
  content: 'contentAgent',
  instagram: 'instagramAgent',
  browser: 'browserAgent',
  messaging: 'messagingAgent',
  docs: 'docsAgent',
  crm: 'crmAgent',
  project: 'projectAgent',
  realEstate: 'realEstateAgent',
  finance: 'financeAgent',
  marketing: 'marketingAgent',
  metaAds: 'metaAdsAgent',
  adsScraper: 'adsScraperAgent',
  adAnalyzer: 'adAnalyzerAgent',
  campaignBuilder: 'campaignBuilderAgent',
  sdr: 'sdrAgent',
}

export const AGENT_CATALOG: AgentCatalogEntry[] = AGENT_REGISTRY.map((a) => ({
  id: a.id,
  toolId: a.toolId,
  toolsObjectKey: TOOLS_KEY_BY_ID[a.id],
}))

export function getToolsObjectKeyForAgent(id: AgentId): AgentToolsDelegateKey {
  return TOOLS_KEY_BY_ID[id]
}

/** Workflow compiler: agent node id → factory (empty providers; runtime uses real connections elsewhere). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WORKFLOW_AGENT_FACTORIES: Record<string, (userId: string, tenantId?: string) => Promise<any>> =
  {
    email: async (userId) => (await createEmailAgent(userId, [])).agent,
    research: async (userId) => createResearchAgent(userId),
    calendar: async (userId) => (await createCalendarAgent(userId, [])).agent,
    linkedin: async (userId) => createLinkedInAgent(userId),
    content: async (userId) => await createContentAgent(userId),
    instagram: async (userId) => createInstagramAgent(userId),
    browser: async (userId) => createBrowserAgent(userId),
    messaging: async (userId) => (await createMessagingAgent(userId, [])).agent,
    docs: async (userId) => (await createDocsAgent(userId, [])).agent,
    crm: async (userId) => (await createCrmAgent(userId, [])).agent,
    project: async (userId) => (await createProjectAgent(userId, [])).agent,
    realEstate: async (userId) => (await createRealEstateAgent(userId, [])).agent,
    finance: async (userId) => (await createFinanceAgent(userId, [])).agent,
    marketing: async (userId) => (await createMarketingAgent(userId, [])).agent,
    metaAds: async (userId) => (await createMetaAdsAgent(userId, [])).agent,
    adsScraper: async (userId) => (await createAdsScraperAgent(userId, [])).agent,
    adAnalyzer: async (userId) => (await createAdAnalyzerAgent(userId, [])).agent,
    campaignBuilder: async (userId) =>
      (await createCampaignBuilderAgent(userId, [])).agent,
    sdr: async (userId, tenantId) => createSDRAgent(userId, tenantId ?? ''),
  }

export function agentIdForOrchestratorToolId(toolId: string): AgentId | undefined {
  return AGENT_BY_TOOL_ID.get(toolId)?.id
}
