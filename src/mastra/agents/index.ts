/**
 * Central agent registry — factory functions for all agents.
 */
export { createOrchestratorAgent } from './orchestrator'
export { createEmailAgent } from './emailAgent'
export { createResearchAgent } from './researchAgent'
export { createCalendarAgent } from './calendarAgent'
export { createLinkedInAgent } from './linkedinAgent'
export { createContentAgent } from './contentAgent'
export { createInstagramAgent } from './instagramAgent'
export { createBrowserAgent } from './browserAgent'
export { createSlackAgent } from './slackAgent'
export { createNotionAgent } from './notionAgent'

import { createOrchestratorAgent } from './orchestrator'
import { createEmailAgent } from './emailAgent'
import { createResearchAgent } from './researchAgent'
import { createCalendarAgent } from './calendarAgent'
import { createLinkedInAgent } from './linkedinAgent'
import { createContentAgent } from './contentAgent'
import { createInstagramAgent } from './instagramAgent'
import { createBrowserAgent } from './browserAgent'
import { createSlackAgent } from './slackAgent'
import { createNotionAgent } from './notionAgent'
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
export function createAllAgents(
  userId: string,
  tenantId: string
): AllAgents {
  return {
    orchestrator: createOrchestratorAgent(userId, tenantId),
    email: createEmailAgent(userId),
    research: createResearchAgent(userId),
    calendar: createCalendarAgent(userId),
    linkedin: createLinkedInAgent(userId),
    content: createContentAgent(userId),
    instagram: createInstagramAgent(userId),
    browser: createBrowserAgent(userId),
    slack: createSlackAgent(userId),
    notion: createNotionAgent(userId),
  }
}
