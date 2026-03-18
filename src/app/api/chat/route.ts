import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { toAISdkStream } from '@mastra/ai-sdk'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import type { Agent } from '@mastra/core/agent'
import {
  createOrchestratorAgent,
  createEmailAgent,
  createResearchAgent,
  createDeepResearchAgent,
  createCalendarAgent,
  createLinkedInAgent,
  createContentAgent,
  createInstagramAgent,
  createBrowserAgent,
  createMessagingAgent,
  createDocsAgent,
  createCrmAgent,
  createProjectAgent,
  createRealEstateAgent,
  createFinanceAgent,
  createMarketingAgent,
} from '@/mastra'
import { retrieveRelevantContext, buildContextBlock } from '@/services/contextService'
import { createWorkspaceForTenant } from '@/mastra/createWorkspaceForTenant'
import { buildProspectsContext } from '@/services/prospectsContextService'
import { getTenantContext } from '@/middleware/tenantContext'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AGENT_BY_ID, type AgentId } from '@/constants/agents'
import { CHAT_CREDIT_ACTION, CHAT_LIMITS, CHAT_ROLES, type AgentMessage } from '@/constants/chat'
import {
  isAgentAllowed,
  isFeatureEnabled,
} from '@/constants/featureGating'
import { getComposioConnectionStatus } from '@/lib/composio'

// Exa Websets can take 5–10 min for complex searches; allow long-running SDR tool calls
export const maxDuration = 300

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Extract the latest user message text from the request body.
 * Supports AI SDK v6 UIMessage[] format (parts-based) and plain `message` string for
 * backward compatibility (Telegram webhook, etc.).
 */
function extractUserMessage(body: Record<string, unknown>): string | null {
  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message.trim()
  }

  const messages = body.messages as Array<{
    role: string
    parts?: Array<{ type: string; text?: string }>
    content?: string
  }> | undefined

  if (!messages?.length) return null

  const lastUser = [...messages].reverse().find((m) => m.role === CHAT_ROLES.USER)
  if (!lastUser) return null

  if (lastUser.parts) {
    const texts = lastUser.parts
      .filter((p) => p.type === 'text' && p.text?.trim())
      .map((p) => p.text!.trim())
    return texts.join(' ') || null
  }

  return typeof lastUser.content === 'string' ? lastUser.content.trim() || null : null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { threadId, agentInstructions, pinnedSkillIds, targetAgent, deepResearch, model, messages: uiMessages } = body as {
      threadId?: string
      agentInstructions?: Record<string, string>
      pinnedSkillIds?: string[]
      targetAgent?: string
      deepResearch?: boolean
      model?: string
      messages?: unknown[]
    }

    console.log('[Chat API] Body keys:', Object.keys(body), '| messages count:', uiMessages?.length ?? 0)

    const message = extractUserMessage(body)
    if (!message) {
      console.warn('[Chat API] Could not extract message. Body sample:', JSON.stringify(body).slice(0, 500))
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    console.log('[Chat API] Extracted message:', message.slice(0, 100))

    const tenantCtx = await getTenantContext()
    const { userId, tenantId, config } = tenantCtx

    if (targetAgent && !isAgentAllowed(config, targetAgent)) {
      return NextResponse.json(
        {
          error: `Agent "${targetAgent}" is not available for your organization. Contact your admin to request access.`,
        },
        { status: 403 }
      )
    }

    if (deepResearch && !isFeatureEnabled(config, 'deepResearch')) {
      return NextResponse.json(
        {
          error:
            'Deep research is not available for your organization. Contact your admin to request access.',
        },
        { status: 403 }
      )
    }

    console.log(`[Chat API] tenantId=${tenantId} | userId=${userId} | threadId=${threadId ?? 'none'}`)

    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch((err) => {
        console.warn('[Chat API] DB user lookup failed:', (err as Error)?.message ?? err)
        return null
      })

    if (dbUser) {
      const hasCredits = await convex
        .query(api.credits.hasEnoughCredits, {
          tenantId: dbUser.tenantId,
          action: CHAT_CREDIT_ACTION,
        })
        .catch(() => true)

      if (!hasCredits) {
        return NextResponse.json(
          { error: 'Insufficient credits. Please upgrade your plan or purchase more credits.' },
          { status: 402 }
        )
      }
    }

    const dbUserId = dbUser?._id ? String(dbUser._id) : undefined
    // Convex tenant ID (required for mutations); fallback: resolve Clerk org ID
    const convexTenantId =
      dbUser?.tenantId ??
      (
        await convex
          .query(api.tenants.getTenantByClerkOrgId, { clerkOrgId: tenantId })
          .catch(() => null)
      )?._id
    const skillScope = dbUser
      ? {
          tenantId: String(dbUser.tenantId),
          userId: String(dbUser._id),
        }
      : undefined

    const workspace = skillScope
      ? await createWorkspaceForTenant(skillScope.tenantId, skillScope.userId)
      : undefined

    const [relevantContext, historyDocs, prospectsContext] = await Promise.all([
      retrieveRelevantContext(message, tenantId, dbUserId).catch((err) => {
        console.warn('[Chat API] Context retrieval failed (continuing without):', err?.message ?? err)
        return []
      }),
      threadId
        ? convex
            .query(api.messages.getMessagesByThreadId, { threadId, limit: CHAT_LIMITS.HISTORY_LIMIT })
            .catch((err) => {
              console.warn('[Chat API] History fetch failed:', err?.message ?? err)
              return []
            })
        : Promise.resolve([]),
      dbUser
        ? buildProspectsContext(dbUser.tenantId, dbUserId).catch((err) => {
            console.warn('[Chat API] Prospects context failed (continuing without):', (err as Error)?.message ?? err)
            return ''
          })
        : Promise.resolve(''),
    ])

    console.log(
      `[Chat API] workspace=${workspace ? 'yes' : 'no'} | context=${relevantContext.length} docs | history=${historyDocs.length} msgs`
    )

    let connectedProviders: string[] = []
    if (dbUser) {
      try {
        const composioStatus = await getComposioConnectionStatus(userId)
        connectedProviders = (Object.entries(composioStatus) as [string, boolean][])
          .filter(([, connected]) => connected)
          .map(([provider]) => provider)
      } catch (err) {
        console.warn('[Chat API] Composio status fetch failed:', (err as Error)?.message ?? err)
      }
    }

    console.log(`[Chat API] connectedProviders=${connectedProviders.join(', ') || 'none'}`)

    const contextBlock = buildContextBlock(relevantContext)

    const agentMessages: AgentMessage[] = []

    const systemParts = [contextBlock, prospectsContext].filter(Boolean)
    if (systemParts.length > 0) {
      agentMessages.push({ role: CHAT_ROLES.SYSTEM, content: systemParts.join('\n\n---\n\n') })
    }

    for (const doc of historyDocs) {
      if (doc.content === message && doc.role === CHAT_ROLES.USER) continue
      agentMessages.push({ role: doc.role as AgentMessage['role'], content: doc.content })
    }

    agentMessages.push({ role: CHAT_ROLES.USER, content: message })

    if (dbUser) {
      convex
        .mutation(api.credits.deductCredits, {
          tenantId: dbUser.tenantId,
          userId: dbUser._id as Id<'users'>,
          action: CHAT_CREDIT_ACTION,
        })
        .catch((err) => {
          console.warn('[Chat API] Credit deduction failed:', (err as Error)?.message ?? err)
        })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stream: any = null
    const instructions = agentInstructions ?? {}
    const meta = targetAgent ? AGENT_BY_ID.get(targetAgent as AgentId) : undefined

    if (meta) {
      const agentId = meta.id
      const agentInstructionsForTarget = instructions[agentId] ?? instructions[meta.toolId] ?? undefined
      const taskWithInstructions = agentInstructionsForTarget?.trim()
        ? `[Custom instructions: ${agentInstructionsForTarget.trim()}]\n\n${message}`
        : message

      const composioAgentIds = ['email', 'calendar', 'messaging', 'docs', 'crm', 'project', 'realEstate', 'finance', 'marketing'] as const
      const simpleAgentIds = ['research', 'linkedin', 'content', 'instagram', 'browser'] as const

      if (composioAgentIds.includes(agentId as (typeof composioAgentIds)[number])) {
        const createFns = {
          email: createEmailAgent,
          calendar: createCalendarAgent,
          messaging: createMessagingAgent,
          docs: createDocsAgent,
          crm: createCrmAgent,
          project: createProjectAgent,
          realEstate: createRealEstateAgent,
          finance: createFinanceAgent,
          marketing: createMarketingAgent,
        }
        const createFn = createFns[agentId as (typeof composioAgentIds)[number]]
        if (createFn) {
          const { agent, toolsets } = await createFn(userId, connectedProviders, workspace)
          const agentMessagesWithTask = [...agentMessages]
          const lastIdx = agentMessagesWithTask.length - 1
          if (lastIdx >= 0 && agentMessagesWithTask[lastIdx]?.role === CHAT_ROLES.USER) {
            agentMessagesWithTask[lastIdx] = { role: CHAT_ROLES.USER, content: taskWithInstructions }
          }
          stream = await agent.stream(
            agentMessagesWithTask as Parameters<typeof agent.stream>[0],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { toolsets } as any
          )
        }
      } else if (simpleAgentIds.includes(agentId as (typeof simpleAgentIds)[number])) {
        const draftScope = skillScope ? { tenantId: skillScope.tenantId, userId: skillScope.userId } : undefined
        let agent: Agent
        if (agentId === 'content') {
          agent = createContentAgent(userId, draftScope, workspace)
        } else {
          const createFns = {
            research: createResearchAgent,
            linkedin: createLinkedInAgent,
            instagram: createInstagramAgent,
            browser: createBrowserAgent,
          }
          const createFn = createFns[agentId as keyof typeof createFns]
          agent = createFn(userId, workspace) as Agent
        }
        const agentMessagesWithTask = [...agentMessages]
        const lastIdx = agentMessagesWithTask.length - 1
        if (lastIdx >= 0 && agentMessagesWithTask[lastIdx]?.role === CHAT_ROLES.USER) {
          agentMessagesWithTask[lastIdx] = { role: CHAT_ROLES.USER, content: taskWithInstructions }
        }
        stream = await agent.stream(agentMessagesWithTask as Parameters<typeof agent.stream>[0])
      }
    }

    if (stream === null && deepResearch) {
      console.log('[Chat API] Deep research mode enabled')
      const agent = createDeepResearchAgent(userId)
      stream = await agent.stream(agentMessages as Parameters<typeof agent.stream>[0])
    }

    if (stream === null) {
      const agent = await createOrchestratorAgent(
        userId,
        convexTenantId ?? tenantId,
        agentInstructions,
        connectedProviders,
        model,
        skillScope
      )
      stream = await agent.stream(agentMessages as Parameters<typeof agent.stream>[0])
    }

    let capturedUsage: { promptTokens?: number; completionTokens?: number } | null = null
    const aiStream = toAISdkStream(stream!, { from: 'agent' })

    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({
          type: 'data-skills',
          data: { type: 'skills', items: [] },
        })
        for await (const part of aiStream as AsyncIterable<{
          type?: string
          usage?: { promptTokens?: number; completionTokens?: number }
        }>) {
          const p = part as Record<string, unknown>
          if (p?.type === 'finish' && p.usage && typeof p.usage === 'object') {
            const u = p.usage as { promptTokens?: number; completionTokens?: number }
            capturedUsage = {
              promptTokens: u.promptTokens,
              completionTokens: u.completionTokens,
            }
          }
          await writer.write(part as Parameters<typeof writer.write>[0])
        }
        if (capturedUsage) {
          writer.write({
            type: 'data-usage',
            data: {
              type: 'usage',
              inputTokens: capturedUsage.promptTokens ?? 0,
              outputTokens: capturedUsage.completionTokens ?? 0,
            },
          })
        }
      },
    })

    return createUIMessageStreamResponse({ stream: uiStream })
  } catch (error) {
    console.error('[Chat API] Error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
