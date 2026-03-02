import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { createEmailAgent } from '../agents/emailAgent'
import { createResearchAgent } from '../agents/researchAgent'
import { createCalendarAgent } from '../agents/calendarAgent'
import { createLinkedInAgent } from '../agents/linkedinAgent'
import { createContentAgent } from '../agents/contentAgent'
import { createInstagramAgent } from '../agents/instagramAgent'
import { createBrowserAgent } from '../agents/browserAgent'
import { createSlackAgent } from '../agents/slackAgent'
import { createNotionAgent } from '../agents/notionAgent'

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
 */
export function createAgentTools(
  userId: string,
  tenantId: string,
  agentInstructions?: Record<string, string>
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
          const agent = createCalendarAgent(userId)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.calendar)
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

    slackAgent: createTool({
      id: 'slack-agent',
      description:
        'Delegate Slack tasks to the Slack Agent. Use for: listing channels and users, ' +
        'sending messages to channels, and workspace communication. ' +
        'The agent always confirms before sending messages.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const agent = createSlackAgent(userId)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.slack)
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Slack agent error: ${message}`
        }
      },
    }),

    notionAgent: createTool({
      id: 'notion-agent',
      description:
        'Delegate Notion tasks to the Notion Agent. Use for: searching pages, reading page content, ' +
        'and creating new pages in Notion workspaces.',
      inputSchema: taskSchema,
      execute: async (input) => {
        try {
          const agent = createNotionAgent(userId)
          const result = await agent.generate(
            withCustomInstructions(input.task, agentInstructions?.notion)
          )
          return result.text
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Notion agent error: ${message}`
        }
      },
    }),
  }
}
