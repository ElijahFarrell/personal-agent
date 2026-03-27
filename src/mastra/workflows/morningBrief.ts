import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { generateText } from 'ai'
import { gateway } from 'ai'
import MemoryClient from 'mem0ai'
import { config } from '@/lib/config'
import { gatewayReportingProviderOptions } from '@/lib/aiGatewayReporting'
import {
  listTodayEvents,
  listUpcomingEvents,
} from '@/services/calendarService'
import { listUnread } from '@/services/gmailService'
import type { MorningBriefContext, MorningBrief } from '@/types'

const morningBriefContextSchema = z.object({
  date: z.string(),
  calendarEvents: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      startTime: z.string(),
      endTime: z.string(),
      attendees: z.array(z.string()).optional(),
      location: z.string().optional(),
      meetingLink: z.string().optional(),
    })
  ),
  unreadEmails: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      from: z.string(),
      to: z.array(z.string()),
      body: z.string(),
      snippet: z.string(),
      date: z.string(),
      threadId: z.string(),
      isRead: z.boolean(),
    })
  ),
  topMemories: z.array(z.string()),
  previousBriefSummary: z.string().optional(),
})

const morningBriefSchema = z.object({
  greeting: z.string(),
  topPriority: z.string(),
  schedule: z.string(),
  actionItems: z.array(z.string()),
  generatedAt: z.string(),
})

/**
 * Practical implementation: runs the morning brief by directly calling services.
 * Works even when the full Mastra workflow is not configured.
 */
export async function executeMorningBrief(
  userId: string,
  tenantId: string
): Promise<MorningBrief> {
  const mem0Client = config.mem0.apiKey
    ? new MemoryClient({ apiKey: config.mem0.apiKey })
    : null

  const [calendarToday, calendarUpcoming, unreadEmails, memoryResults] =
    await Promise.all([
      listTodayEvents(userId),
      listUpcomingEvents(userId, 3),
      listUnread(userId, 15),
      mem0Client
        ? mem0Client.search('morning brief previous day priorities projects', {
            filters: { user_id: userId },
            limit: 5,
          })
        : Promise.resolve([]),
    ])

  const topMemories = (memoryResults as Array<{ memory?: string }>)
    .map((r) => r.memory)
    .filter(Boolean) as string[]

  const previousBriefSummary = topMemories.find((m) =>
    m.toLowerCase().includes('brief') || m.toLowerCase().includes('priority')
  )

  const context: MorningBriefContext = {
    date: new Date().toISOString().split('T')[0],
    calendarEvents: [...calendarToday, ...calendarUpcoming],
    unreadEmails,
    topMemories,
    previousBriefSummary,
  }

  const { text } = await generateText({
    model: gateway('anthropic/claude-sonnet-4-5'),
    system: `You generate a personalized morning brief for a personal AI OS user.
Given calendar events, unread emails, and relevant memories, produce a structured brief.

Output valid JSON matching this shape:
{
  "greeting": "Personalized greeting based on time of day",
  "topPriority": "Single highest-leverage task or focus for today (1-2 sentences)",
  "schedule": "Concise overview of today's calendar (or 'No meetings' if empty)",
  "actionItems": ["Item 1", "Item 2", "Item 3"],
  "generatedAt": "ISO timestamp"
}

Be concise. Prioritize what needs attention. Cross-reference memory with calendar/email when relevant.`,
    prompt: `Generate the morning brief for ${context.date}.

Calendar (today + next 3 days):
${JSON.stringify(context.calendarEvents, null, 2)}

Unread emails (${context.unreadEmails.length}):
${context.unreadEmails.map((e) => `- ${e.from}: ${e.subject} (${e.snippet})`).join('\n')}

Relevant memories:
${context.topMemories.join('\n')}

${context.previousBriefSummary ? `Previous brief context: ${context.previousBriefSummary}` : ''}`,
    ...gatewayReportingProviderOptions({
      user: userId,
      tags: ['surface:morning-brief', 'workflow:morning-brief', `tenant:${tenantId}`],
    }),
  })

  let brief: MorningBrief
  try {
    const parsed = JSON.parse(text) as MorningBrief
    brief = {
      ...parsed,
      generatedAt: parsed.generatedAt ?? new Date().toISOString(),
    }
  } catch {
    brief = {
      greeting: 'Good morning!',
      topPriority: 'Review your calendar and inbox.',
      schedule: 'See your calendar for today\'s schedule.',
      actionItems: ['Check unread emails', 'Review calendar', 'Set today\'s focus'],
      generatedAt: new Date().toISOString(),
    }
  }

  if (mem0Client) {
    const summary = `Morning brief ${brief.generatedAt}: Top priority: ${brief.topPriority}. Action items: ${brief.actionItems.join('; ')}`
    await mem0Client.add([{ role: 'user', content: summary }], {
      user_id: userId,
    })
  }

  return brief
}

const gatherContextStep = createStep({
  id: 'gather-context',
  description: 'Fetch calendar, emails, and memories in parallel',
  inputSchema: z.object({
    userId: z.string(),
    tenantId: z.string(),
  }),
  outputSchema: morningBriefContextSchema,
  execute: async ({ inputData }) => {
    const { userId } = inputData
    const mem0Client = config.mem0.apiKey
      ? new MemoryClient({ apiKey: config.mem0.apiKey })
      : null

    const [calendarToday, calendarUpcoming, unreadEmails, memoryResults] =
      await Promise.all([
        listTodayEvents(userId),
        listUpcomingEvents(userId, 3),
        listUnread(userId, 15),
        mem0Client
          ? mem0Client.search('morning brief previous day priorities projects', {
              filters: { user_id: userId },
              limit: 5,
            })
          : Promise.resolve([]),
      ])

    const topMemories = (memoryResults as Array<{ memory?: string }>)
      .map((r) => r.memory)
      .filter(Boolean) as string[]

    const previousBriefSummary = topMemories.find((m) =>
      m.toLowerCase().includes('brief') || m.toLowerCase().includes('priority')
    )

    return {
      date: new Date().toISOString().split('T')[0],
      calendarEvents: [...calendarToday, ...calendarUpcoming],
      unreadEmails,
      topMemories,
      previousBriefSummary,
    }
  },
})

const generateBriefStep = createStep({
  id: 'generate-brief',
  description: 'Generate structured morning brief from context',
  inputSchema: morningBriefContextSchema,
  outputSchema: morningBriefSchema,
  execute: async ({ inputData, getInitData }) => {
    const init = getInitData<{ userId: string; tenantId: string }>()
    const { text } = await generateText({
      model: gateway('anthropic/claude-sonnet-4-5'),
      system: `You generate a personalized morning brief. Output valid JSON:
{ "greeting": string, "topPriority": string, "schedule": string, "actionItems": string[], "generatedAt": string }`,
      prompt: `Generate brief for ${inputData.date}. Calendar: ${JSON.stringify(inputData.calendarEvents)}. Emails: ${inputData.unreadEmails.map((e) => e.subject).join(', ')}. Memories: ${inputData.topMemories.join('; ')}`,
      ...gatewayReportingProviderOptions({
        user: init?.userId ?? 'system:morning-brief',
        tags: [
          'surface:morning-brief',
          'workflow:morning-brief',
          ...(init?.tenantId ? [`tenant:${init.tenantId}`] : []),
        ],
      }),
    })

    try {
      const parsed = JSON.parse(text) as MorningBrief
      return {
        ...parsed,
        generatedAt: parsed.generatedAt ?? new Date().toISOString(),
      }
    } catch {
      return {
        greeting: 'Good morning!',
        topPriority: 'Review your calendar and inbox.',
        schedule: 'See your calendar.',
        actionItems: ['Check emails', 'Review calendar'],
        generatedAt: new Date().toISOString(),
      }
    }
  },
})

const storeToMemoryStep = createStep({
  id: 'store-to-memory',
  description: 'Store brief summary for previous brief context',
  inputSchema: morningBriefSchema,
  outputSchema: morningBriefSchema,
  execute: async ({ inputData, getInitData }) => {
    const initData = getInitData<{ userId: string; tenantId: string }>()
    const mem0Client = config.mem0.apiKey
      ? new MemoryClient({ apiKey: config.mem0.apiKey })
      : null

    if (mem0Client && initData?.userId) {
      const summary = `Morning brief ${inputData.generatedAt}: ${inputData.topPriority}. Actions: ${inputData.actionItems.join('; ')}`
      await mem0Client.add([{ role: 'user', content: summary }], {
        user_id: initData.userId,
      })
    }
    return inputData
  },
})

export const morningBriefWorkflow = createWorkflow({
  id: 'morning-brief',
  inputSchema: z.object({
    userId: z.string(),
    tenantId: z.string(),
  }),
  outputSchema: morningBriefSchema,
})
  .then(gatherContextStep)
  .then(generateBriefStep)
  .then(storeToMemoryStep)
  .commit()
