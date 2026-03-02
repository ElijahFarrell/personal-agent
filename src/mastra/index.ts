import { Mastra } from '@mastra/core'

/**
 * The Mastra instance is the registry for all agents and workflows.
 * Agents are created per-user via factories (for memory isolation),
 * so we don't register them here directly — they're instantiated in route handlers.
 */
export const mastra = new Mastra({})

export {
  createOrchestratorAgent,
  createEmailAgent,
  createResearchAgent,
  createLinkedInAgent,
  createContentAgent,
  createInstagramAgent,
  createBrowserAgent,
  createAllAgents,
} from './agents'
export { executeMorningBrief, morningBriefWorkflow } from './workflows/morningBrief'
export {
  executeOutreachCampaign,
  type OutreachTarget,
  type OutreachCampaignInput,
  type OutreachCampaignResult,
} from './workflows/outreachCampaign'
