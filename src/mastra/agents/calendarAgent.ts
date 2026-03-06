import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createCalendarListTool, createCalendarCreateTool } from '../tools/calendarTools'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { getNangoMCPToolsets } from '@/lib/nangoMcp'
import { CALENDAR_PROMPT } from '../prompts'

export interface CalendarAgentResult {
  agent: Agent
  toolsets: Record<string, Record<string, unknown>>
}

/**
 * Creates the Calendar agent with MCP tools for google-calendar (list) and custom create.
 * Use for orchestrator delegation with connectedProviders.
 */
export async function createCalendarAgent(
  userId: string,
  connectedProviders: string[]
): Promise<CalendarAgentResult> {
  const useMcp = connectedProviders.includes('google-calendar')
  const toolsets = useMcp
    ? await getNangoMCPToolsets(userId, ['google-calendar'])
    : {}

  const agent = new Agent({
    id: `calendar-${userId}`,
    name: 'calendar',
    instructions: CALENDAR_PROMPT,
    model: AgentModels.calendar(),
    tools: useMcp
      ? {
          calendarCreate: createCalendarCreateTool(userId),
          mem0Recall: createMem0RecallTool(userId),
          mem0Memorize: createMem0MemorizeTool(userId),
        }
      : {
          calendarList: createCalendarListTool(userId),
          calendarCreate: createCalendarCreateTool(userId),
          mem0Recall: createMem0RecallTool(userId),
          mem0Memorize: createMem0MemorizeTool(userId),
        },
  })

  return { agent, toolsets }
}

/** Sync factory for createAllAgents — uses custom tools when MCP not available. */
export function createCalendarAgentSync(userId: string): Agent {
  return new Agent({
    id: `calendar-${userId}`,
    name: 'calendar',
    instructions: CALENDAR_PROMPT,
    model: AgentModels.calendar(),
    tools: {
      calendarList: createCalendarListTool(userId),
      calendarCreate: createCalendarCreateTool(userId),
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
  })
}
