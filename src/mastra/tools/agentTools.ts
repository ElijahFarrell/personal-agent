import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getNextRunAt } from '@/services/scheduleService'
import {
  resolveSkillsForMessage,
  buildSkillsSystemContext,
  type SkillPreference,
} from '@/services/skillsService'
import type { SkillLookupScope } from '@/services/skillsService'
import {
  retrieveRelevantContext,
  buildContextBlock,
} from '@/services/contextService'
import { createEmailAgent } from '../agents/emailAgent'
import { createResearchAgent } from '../agents/researchAgent'
import { createCalendarAgent } from '../agents/calendarAgent'
import { createLinkedInAgent } from '../agents/linkedinAgent'
import { createContentAgent } from '../agents/contentAgent'
import { createInstagramAgent } from '../agents/instagramAgent'
import { createBrowserAgent } from '../agents/browserAgent'
import { createMessagingAgent } from '../agents/messagingAgent'
import { createDocsAgent } from '../agents/docsAgent'
import { createCrmAgent } from '../agents/crmAgent'
import { createProjectAgent } from '../agents/projectAgent'
import { createRealEstateAgent } from '../agents/realEstateAgent'
import { createFinanceAgent } from '../agents/financeAgent'
import { createMarketingAgent } from '../agents/marketingAgent'
import { createSDRAgent } from '../agents/sdrAgent'
import { createLeadAgent } from '../agents/leadAgent'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const taskSchema = z.object({
  task: z.string().describe('Complete description of the task to perform, including all relevant context (names, URLs, tone, goals)'),
})

/** Prepends custom instructions to a task string if any are provided. */
function withCustomInstructions(task: string, instructions: string | undefined): string {
  if (!instructions?.trim()) return task
  return `[Custom instructions for this agent: ${instructions.trim()}]\n\n${task}`
}

export interface AgentToolsSkillContext {
  scope: SkillLookupScope
  preferences: SkillPreference[]
}

/**
 * Creates all sub-agent tools scoped to a user.
 * Each tool wraps a specialized agent's generate() call so the orchestrator
 * can delegate work — and call multiple agents in parallel — via its tool interface.
 *
 * Custom instructions per agent are appended to each task when provided,
 * giving users control over individual agent behavior from the dashboard.
 * connectedProviders is used by MCP-based agents to load tools for connected integrations.
 * When skillContext is provided, sub-agents receive skills and context for progressive discovery.
 */
export function createAgentTools(
  userId: string,
  tenantId: string,
  agentInstructions?: Record<string, string>,
  connectedProviders: string[] = [],
  skillContext?: AgentToolsSkillContext
) {
  async function buildSubAgentContext(task: string): Promise<string> {
    const scope = skillContext?.scope
    if (!scope?.tenantId || !scope?.userId) return ''
    const [resolvedSkills, relevantContext] = await Promise.all([
      resolveSkillsForMessage(task, skillContext!.preferences, 5, scope).catch(() => []),
      retrieveRelevantContext(task, scope.tenantId, scope.userId).catch(() => []),
    ])
    const skillsBlock = buildSkillsSystemContext(resolvedSkills)
    const contextBlock = buildContextBlock(relevantContext)
    return [skillsBlock, contextBlock].filter(Boolean).join('\n\n---\n\n')
  }

  async function getInputForAgent(
    task: string,
    taskWithInstructions: string
  ): Promise<string> {
    const contextBlock = await buildSubAgentContext(task)
    if (!contextBlock) return taskWithInstructions
    return `## Relevant Skills and Context\n\n${contextBlock}\n\n---\n\n## Your Task\n\n${taskWithInstructions}`
  }

  return {
    emailAgent: createTool({
      id: 'email-agent',
      description:
        'Delegate email tasks to the Email Agent. Use for: reading and summarizing the inbox, ' +
        'drafting replies, sending emails, and anything else email-related. ' +
        'The agent will always draft first and ask for confirmation before sending.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.email)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const agent = createEmailAgent(userId)
          const result = await agent.generate(inputForAgent)
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Email agent error: ${message}`
        }
      },
    }),

    researchAgent: createTool({
      id: 'research-agent',
      description:
        'Delegate research tasks to the Research Agent. Use for: web searches, fact-finding, ' +
        'market research, competitive analysis, news lookups, and topic deep-dives. ' +
        'Returns structured findings with cited sources.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.research)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const agent = createResearchAgent(userId)
          const result = await agent.generate(inputForAgent)
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Research agent error: ${message}`
        }
      },
    }),

    calendarAgent: createTool({
      id: 'calendar-agent',
      description:
        'Delegate calendar tasks to the Calendar Agent. Use for: viewing today\'s schedule, ' +
        'checking upcoming events, creating new events, and identifying availability windows.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.calendar)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const { agent, toolsets } = await createCalendarAgent(userId, connectedProviders)
          const result = await agent.generate(
            inputForAgent,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { toolsets } as any
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Calendar agent error: ${message}`
        }
      },
    }),

    linkedinAgent: createTool({
      id: 'linkedin-agent',
      description:
        'Delegate LinkedIn tasks to the LinkedIn Agent. Use for: researching LinkedIn profiles, ' +
        'drafting personalized outreach messages, running DM campaigns, and searching for people. ' +
        'The agent will always draft first and ask for confirmation before sending.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.linkedin)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const agent = createLinkedInAgent(userId)
          const result = await agent.generate(inputForAgent)
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `LinkedIn agent error: ${message}`
        }
      },
    }),

    contentAgent: createTool({
      id: 'content-agent',
      description:
        'Delegate content creation to the Content Agent. Use for: writing LinkedIn posts, ' +
        'newsletters, tweets, marketing copy, and any professional content. ' +
        'The agent recalls brand voice from memory and drafts on-brand content.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.content)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const draftScope =
            skillContext?.scope?.tenantId && skillContext?.scope?.userId
              ? { tenantId: skillContext.scope.tenantId, userId: skillContext.scope.userId }
              : undefined
          const agent = createContentAgent(userId, draftScope)
          const result = await agent.generate(inputForAgent)
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Content agent error: ${message}`
        }
      },
    }),

    instagramAgent: createTool({
      id: 'instagram-agent',
      description:
        'Delegate Instagram messaging to the Instagram Agent. Use for: sending Instagram DMs ' +
        'and outreach campaigns. The agent will always draft first and ask for confirmation before sending.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.instagram)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const agent = createInstagramAgent(userId)
          const result = await agent.generate(inputForAgent)
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Instagram agent error: ${message}`
        }
      },
    }),

    browserAgent: createTool({
      id: 'browser-agent',
      description:
        'Delegate web automation tasks to the Browser Agent. Use for: navigating websites, ' +
        'extracting content from pages, filling and submitting forms, and any web automation. ' +
        'The agent confirms before submitting forms.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.browser)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const agent = createBrowserAgent(userId)
          const result = await agent.generate(inputForAgent)
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Browser agent error: ${message}`
        }
      },
    }),

    messagingAgent: createTool({
      id: 'messaging-agent',
      description:
        'Delegate messaging tasks to the Messaging Agent. Use for: Slack, Microsoft Teams, Discord — ' +
        'list channels/users, send messages. The agent always confirms before sending.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.messaging)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const { agent, toolsets } = await createMessagingAgent(userId, connectedProviders)
          const result = await agent.generate(
            inputForAgent,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { toolsets } as any
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Messaging agent error: ${message}`
        }
      },
    }),

    docsAgent: createTool({
      id: 'docs-agent',
      description:
        'Delegate document tasks to the Docs Agent. Use for: Google Docs, Sheets, Airtable, Notion — ' +
        'search, read, create documents and records.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.docs)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const { agent, toolsets } = await createDocsAgent(userId, connectedProviders)
          const result = await agent.generate(
            inputForAgent,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { toolsets } as any
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Docs agent error: ${message}`
        }
      },
    }),

    crmAgent: createTool({
      id: 'crm-agent',
      description:
        'Delegate CRM tasks to the CRM Agent. Use for: HubSpot, Salesforce, Pipedrive, Zoho CRM — ' +
        'contacts, deals, opportunities, companies, tasks, notes. Requires at least one CRM connected.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.crm)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const { agent, toolsets } = await createCrmAgent(userId, connectedProviders)
          const result = await agent.generate(
            inputForAgent,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { toolsets } as any
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `CRM agent error: ${message}`
        }
      },
    }),

    projectAgent: createTool({
      id: 'project-agent',
      description:
        'Delegate project management tasks to the Project Agent. Use for: Jira, Asana, Monday.com — ' +
        'issues, tasks, projects, boards, sprints, updates. Requires at least one connected.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.project)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const { agent, toolsets } = await createProjectAgent(userId, connectedProviders)
          const result = await agent.generate(
            inputForAgent,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { toolsets } as any
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Project agent error: ${message}`
        }
      },
    }),

    realEstateAgent: createTool({
      id: 'real-estate-agent',
      description:
        'Delegate real estate tasks to the Real Estate Agent. Use for: Follow Up Boss, Calendly — ' +
        'contacts, deals, tasks, event types, scheduled events.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.realEstate)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const { agent, toolsets } = await createRealEstateAgent(userId, connectedProviders)
          const result = await agent.generate(
            inputForAgent,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { toolsets } as any
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Real Estate agent error: ${message}`
        }
      },
    }),

    financeAgent: createTool({
      id: 'finance-agent',
      description:
        'Delegate finance tasks to the Finance Agent. Use for: Stripe, QuickBooks — ' +
        'customers, charges, invoices, payments.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.finance)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const { agent, toolsets } = await createFinanceAgent(userId, connectedProviders)
          const result = await agent.generate(
            inputForAgent,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { toolsets } as any
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Finance agent error: ${message}`
        }
      },
    }),

    marketingAgent: createTool({
      id: 'marketing-agent',
      description:
        'Delegate marketing tasks to the Marketing Agent. Use for: Mailchimp — ' +
        'audiences, campaigns.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.marketing)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const { agent, toolsets } = await createMarketingAgent(userId, connectedProviders)
          const result = await agent.generate(
            inputForAgent,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { toolsets } as any
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Marketing agent error: ${message}`
        }
      },
    }),

    sdrAgent: createTool({
      id: 'sdr-agent',
      description:
        'Delegate lead generation to the Lead Agent. Use for: Exa company search, Apollo lead search/enrichment/sequences, Outlook email. ' +
        'When user says "find 50-100 CEOs", "research leads", "personalize outreach", "add to sequence" — use this agent. ' +
        'Exa: search companies, add to Prospects. Apollo: search people, enrich, create contacts, add to sequences. Outlook: send emails.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const taskWithInstructions = withCustomInstructions(input.task, agentInstructions?.sdr)
          const inputForAgent = await getInputForAgent(input.task, taskWithInstructions)
          const agent = await createLeadAgent(userId, tenantId)
          const result = await agent.generate(inputForAgent)
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Lead agent error: ${message}`
        }
      },
    }),

    createSchedule: createTool({
      id: 'create-schedule',
      description:
        'Create a recurring schedule (cron job) for the user. Use when the user wants something to run automatically at a specific time, e.g. "every morning at 9am check my channels", "every Monday send a summary", "hourly pull revenue data". ' +
        'Cron format: minute hour day-of-month month day-of-week (e.g. "0 9 * * *" = 9am daily, "0 9 * * 1" = 9am Mondays). Timezone defaults to America/New_York.',
      inputSchema: z.object({
        name: z.string().describe('Short name for the schedule'),
        description: z.string().optional().describe('What this schedule does'),
        cronExpression: z.string().describe('Cron expression, e.g. "0 9 * * *" for 9am daily'),
        timezone: z.string().optional().describe('IANA timezone, e.g. America/New_York'),
        agentPrompt: z.string().describe('The prompt/instruction to run (e.g. "Check all my communication channels, pull revenue data, and give me insights on what happened the day prior")'),
        autoApprove: z.boolean().optional().describe('If true, auto-approve actions without asking. Default false.'),
      }),
      execute: async (input) => {
        try {
          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: userId,
          })
          if (!dbUser) return 'User not found. Please sign in to create schedules.'

          const nextRunAt = getNextRunAt(
            input.cronExpression,
            input.timezone ?? 'America/New_York'
          )

          const scheduleId = await convex.mutation(api.schedules.create, {
            tenantId: dbUser.tenantId,
            userId: dbUser._id,
            name: input.name,
            description: input.description,
            cronExpression: input.cronExpression,
            timezone: input.timezone ?? 'America/New_York',
            action: {
              type: 'agent_prompt',
              agentPrompt: input.agentPrompt,
            },
            isEnabled: true,
            autoApprove: input.autoApprove ?? false,
            nextRunAt,
          })

          return `Schedule "${input.name}" created. It will run ${input.cronExpression} (${input.timezone ?? 'America/New_York'}). Next run: ${new Date(nextRunAt).toLocaleString()}.`
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Failed to create schedule: ${message}`
        }
      },
    }),

    listSchedules: createTool({
      id: 'list-schedules',
      description: 'List all of the user\'s schedules. Use when the user asks to see their schedules, cron jobs, or automated tasks.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: userId,
          })
          if (!dbUser) return 'User not found. Please sign in to view schedules.'

          const schedules = await convex.query(api.schedules.listByTenantId, {
            tenantId: dbUser.tenantId,
          })

          if (schedules.length === 0) {
            return 'No schedules configured. You can create one by saying something like "every morning at 9am check my channels and give me a brief".'
          }

          return schedules
            .map(
              (s) =>
                `- **${s.name}** [ID: ${s._id}] (${s.isEnabled ? 'enabled' : 'disabled'}): ${s.cronExpression} ${s.timezone} | Next: ${s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : 'N/A'}`
            )
            .join('\n')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Failed to list schedules: ${message}`
        }
      },
    }),

    toggleSchedule: createTool({
      id: 'toggle-schedule',
      description: 'Enable or disable a schedule. Use when the user wants to turn a schedule on or off.',
      inputSchema: z.object({
        scheduleId: z.string().describe('The schedule ID (from listSchedules)'),
        isEnabled: z.boolean().describe('true to enable, false to disable'),
      }),
      execute: async (input) => {
        try {
          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: userId,
          })
          if (!dbUser) return 'User not found.'

          await convex.mutation(api.schedules.toggleEnabled, {
            scheduleId: input.scheduleId as Id<'schedules'>,
            isEnabled: input.isEnabled,
          })
          return `Schedule ${input.isEnabled ? 'enabled' : 'disabled'}.`
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Failed to toggle schedule: ${message}`
        }
      },
    }),

    deleteSchedule: createTool({
      id: 'delete-schedule',
      description: 'Delete a schedule permanently. Use when the user wants to remove a schedule.',
      inputSchema: z.object({
        scheduleId: z.string().describe('The schedule ID (from listSchedules)'),
      }),
      execute: async (input) => {
        try {
          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: userId,
          })
          if (!dbUser) return 'User not found.'

          await convex.mutation(api.schedules.remove, {
            scheduleId: input.scheduleId as Id<'schedules'>,
          })
          return 'Schedule deleted.'
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Failed to delete schedule: ${message}`
        }
      },
    }),
  }
}
