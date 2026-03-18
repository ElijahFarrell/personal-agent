import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getComposioToolsForProviders } from '@/lib/composio'
import { CALENDAR_PROMPT } from '../prompts'
import type { ComposioProvider } from '@/types'

const CALENDAR_PROVIDERS: ComposioProvider[] = ['google-calendar']

export interface CalendarAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Calendar agent with Composio Google Calendar tools.
 */
export async function createCalendarAgent(
  userId: string,
  connectedProviders: string[]
): Promise<CalendarAgentResult> {
  const activeProviders = CALENDAR_PROVIDERS.filter((p) =>
    connectedProviders.includes(p)
  )
  const composioTools =
    activeProviders.length > 0
      ? await getComposioToolsForProviders(userId, activeProviders)
      : {}

  const agent = new Agent({
    id: `calendar-${userId}`,
    name: 'calendar',
    instructions: CALENDAR_PROMPT,
    model: AgentModels.calendar(),
    tools: {
      ...composioTools,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })

  return { agent, toolsets: {} }
}

/** Sync factory for createAllAgents — returns agent with mem0 only (Composio tools require async + connectedProviders). */
export function createCalendarAgentSync(userId: string): Agent {
  return new Agent({
    id: `calendar-${userId}`,
    name: 'calendar',
    instructions: CALENDAR_PROMPT,
    model: AgentModels.calendar(),
    tools: {
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
