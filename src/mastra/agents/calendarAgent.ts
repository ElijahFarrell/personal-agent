import { Agent } from '@mastra/core/agent'
import { AgentModels } from '@/constants/models'
import { createCalendarListTool } from '../tools/calendarTools'
import { createCalendarCreateTool } from '../tools/calendarTools'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { CALENDAR_PROMPT } from '../prompts'

/** Factory creates a Calendar agent scoped to a user. */
export function createCalendarAgent(userId: string) {
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
