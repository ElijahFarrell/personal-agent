import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
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

const taskSchema = z.object({
  task: z.string().describe('Complete description of the task to perform, including all relevant context (names, URLs, tone, goals)'),
})

/** Prepends custom instructions to a task string if any are provided. */
function withCustomInstructions(task: string, instructions: string | undefined): string {
  if (!instructions?.trim()) return task
  return `[Custom instructions for this agent: ${instructions.trim()}]\n\n${task}`
}

/**
 * Creates all sub-agent tools scoped to a user.
 * Each tool wraps a specialized agent's generate() call so the orchestrator
 * can delegate work — and call multiple agents in parallel — via its tool interface.
 *
 * Custom instructions per agent are appended to each task when provided,
 * giving users control over individual agent behavior from the dashboard.
 * connectedProviders is used by MCP-based agents to load tools for connected integrations.
 */
export function createAgentTools(
  userId: string,
  tenantId: string,
  agentInstructions?: Record<string, string>,
  connectedProviders: string[] = []
) {
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
          const agent = createEmailAgent(userId)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.email)
          )
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
          const agent = createResearchAgent(userId)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.research)
          )
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
          const { agent, toolsets } = await createCalendarAgent(userId, connectedProviders)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.calendar),
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
          const agent = createLinkedInAgent(userId)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.linkedin)
          )
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
          const agent = createContentAgent(userId)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.content)
          )
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
          const agent = createInstagramAgent(userId)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.instagram)
          )
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
          const agent = createBrowserAgent(userId)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.browser)
          )
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
          const { agent, toolsets } = await createMessagingAgent(userId, connectedProviders)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.messaging),
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
          const { agent, toolsets } = await createDocsAgent(userId, connectedProviders)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.docs),
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
          const { agent, toolsets } = await createCrmAgent(userId, connectedProviders)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.crm),
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
          const { agent, toolsets } = await createProjectAgent(userId, connectedProviders)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.project),
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
          const { agent, toolsets } = await createRealEstateAgent(userId, connectedProviders)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.realEstate),
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
          const { agent, toolsets } = await createFinanceAgent(userId, connectedProviders)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.finance),
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
          const { agent, toolsets } = await createMarketingAgent(userId, connectedProviders)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.marketing),
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
        'Delegate company search to the SDR Agent. Use Exa Websets to find companies matching a complex query. ' +
        'Progressive flow: 5 samples first, then offer 15-20 more. Display as table. Add to Prospects when user approves.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const agent = createSDRAgent(userId, tenantId)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.sdr)
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `SDR agent error: ${message}`
        }
      },
    }),
  }
}
