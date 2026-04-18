/**
 * Central agent registry — factory functions for all agents.
 */
export * from './schemas'
export { createOrchestratorAgent } from './orchestrator'
export { createEmailAgent, createEmailAgentSync } from './emailAgent'
export { createResearchAgent } from './researchAgent'
export { createDeepResearchAgent } from './deepResearchAgent'
export { createCalendarAgent, createCalendarAgentSync } from './calendarAgent'
export { createLinkedInAgent } from './linkedinAgent'
export { createContentAgent } from './contentAgent'
export { createInstagramAgent } from './instagramAgent'
export { createBrowserAgent } from './browserAgent'
export { createSlackAgent, createSlackAgentSync } from './slackAgent'
export { createMessagingAgent } from './messagingAgent'
export { createNotionAgent, createNotionAgentSync } from './notionAgent'
export { createDocsAgent } from './docsAgent'
export { createCrmAgent } from './crmAgent'
export { createProjectAgent } from './projectAgent'
export { createRealEstateAgent } from './realEstateAgent'
export { createFinanceAgent } from './financeAgent'
export { createMarketingAgent } from './marketingAgent'
export { createMetaAdsAgent } from './metaAdsAgent'
export { createAdsScraperAgent } from './adsScraperAgent'
export { createAdAnalyzerAgent } from './adAnalyzerAgent'
export { createCampaignBuilderAgent } from './campaignBuilderAgent'
export { createSDRAgent } from './sdrAgent'

import { createOrchestratorAgent } from './orchestrator'
import { createEmailAgent, createEmailAgentSync } from './emailAgent'
import { createResearchAgent } from './researchAgent'
import { createCalendarAgent, createCalendarAgentSync } from './calendarAgent'
import { createLinkedInAgent } from './linkedinAgent'
import { createContentAgent } from './contentAgent'
import { createInstagramAgent } from './instagramAgent'
import { createBrowserAgent } from './browserAgent'
import { createSlackAgentSync } from './slackAgent'
import { createNotionAgentSync } from './notionAgent'
import { createDocsAgent } from './docsAgent'
import type { Agent } from '@mastra/core/agent'

export interface AllAgents {
  orchestrator: Agent
  email: Agent
  research: Agent
  calendar: Agent
  linkedin: Agent
  content: Agent
  instagram: Agent
  browser: Agent
  slack: Agent
  notion: Agent
}

/**
 * Create all agents for a user. Returns a keyed object for easy access.
 */
export async function createAllAgents(
  userId: string,
  tenantId: string
): Promise<AllAgents> {
  return {
    orchestrator: await createOrchestratorAgent(userId, tenantId),
    email: createEmailAgentSync(userId),
    research: createResearchAgent(userId),
    calendar: createCalendarAgentSync(userId),
    linkedin: createLinkedInAgent(userId),
    content: await createContentAgent(userId),
    instagram: createInstagramAgent(userId),
    browser: createBrowserAgent(userId),
    slack: createSlackAgentSync(userId),
    notion: createNotionAgentSync(userId),
  }
}
