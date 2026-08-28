/**
 * Stateless per-request agent for the public marketing website chatbot.
 *
 * Exactly two tools:
 *   - search_knowledge: RAG lookup against the marketing knowledge base
 *   - capture_lead: upserts visitor contact info to Convex + sends admin notification
 *
 * No memory, no CRM access, no outbound actions — fully isolated from the
 * authenticated app agents.
 */
import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { AgentModels } from '@/constants/models'
import { bookCallUrl } from '@/lib/marketing/site'
import { buildMarketingChatSystemPrompt } from '../prompts/marketingChat'
import {
  retrieveMarketingContext,
  buildMarketingContextBlock,
} from '@/services/marketingKnowledgeService'
import { sendLeadNotificationEmail } from '@/lib/marketing/email'
import { api } from '@convex/_generated/api'

export interface MarketingChatCaptureContext {
  convex: ConvexHttpClient | null
  sessionId: string
  ip: string
}

function buildTools(captureCtx: MarketingChatCaptureContext) {
  const searchKnowledgeTool = createTool({
    id: 'search_knowledge',
    description:
      'Search the Shiloh knowledge base for specific product information, features, pricing, use cases, or company details. Use when the initial context does not cover what the visitor is asking about.',
    inputSchema: z.object({
      query: z.string().describe('Search query about Shiloh products or services'),
    }),
    execute: async ({ query }) => {
      const results = await retrieveMarketingContext(query)
      if (results.length === 0) {
        return { found: false, context: 'No additional information found for that topic.' }
      }
      return {
        found: true,
        context: results
          .map((r) => `[${r.title}]: ${r.content}`)
          .join('\n\n'),
      }
    },
  })

  const captureLeadTool = createTool({
    id: 'capture_lead',
    description:
      "Capture a website visitor's contact information as soon as they share ANY identifying detail. Call this with just a name, just an email, just a phone number, or any combination. Call it again later if they share more info — the system merges automatically.",
    inputSchema: z.object({
      name: z.string().optional().describe('Visitor name if known'),
      email: z.string().optional().describe('Visitor email address if provided'),
      phone: z.string().optional().describe('Visitor phone number if provided'),
      company: z.string().optional().describe('Visitor company or brokerage name if mentioned'),
      useCase: z.string().optional().describe('Brief description of what they are looking for'),
    }),
    execute: async ({ name, email, phone, company, useCase }) => {
      if (!name && !email && !phone) {
        return { captured: false, reason: 'No identifying info provided.' }
      }

      if (captureCtx.convex) {
        try {
          await captureCtx.convex.mutation(api.marketingChatLeads.captureLead, {
            name,
            email,
            phone,
            company,
            useCase,
            sessionId: captureCtx.sessionId,
            ipAddress: captureCtx.ip,
          })
        } catch (err) {
          console.error('[marketing-chat] Lead capture failed:', err)
        }
      }

      // Fire-and-forget admin notification
      sendLeadNotificationEmail({ name, email, phone, company, useCase }).catch(
        (err) => console.error('[marketing-chat] Lead notification email failed:', err)
      )

      const displayName = name || email || phone
      return {
        captured: true,
        message: `Thanks${name ? `, ${name}` : ''}! Someone from the Shiloh team will follow up${email ? ` at ${email}` : ''} shortly.`,
        displayName,
      }
    },
  })

  return { search_knowledge: searchKnowledgeTool, capture_lead: captureLeadTool }
}

/**
 * Creates a fresh stateless marketing chat agent per request.
 * RAG context is baked into instructions at creation time; capture context
 * (Convex client, session ID, IP) is closed over in the tools.
 */
export function createMarketingChatAgent(
  retrievedContext: string,
  captureCtx: MarketingChatCaptureContext
): Agent {
  return new Agent({
    id: 'shiloh-marketing-chat',
    name: 'marketingChat',
    instructions: buildMarketingChatSystemPrompt(
      retrievedContext,
      'https://example.com/marketing/audit',
      bookCallUrl()
    ),
    model: AgentModels.crm(),
    tools: buildTools(captureCtx),
  })
}
