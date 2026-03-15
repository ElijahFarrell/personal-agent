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
import {
  resolveSkillsForMessage,
  buildSkillsSystemContext,
  type SkillPreference,
} from '@/services/skillsService'
import { retrieveRelevantContext, buildContextBlock } from '@/services/contextService'
import { buildProspectsContext } from '@/services/prospectsContextService'
import { getTenantContext } from '@/middleware/tenantContext'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AGENT_BY_ID, type AgentId } from '@/constants/agents'
import { CHAT_CREDIT_ACTION, CHAT_LIMITS, CHAT_ROLES } from '@/constants/chat'
import {
  isAgentAllowed,
  isFeatureEnabled,
} from '@/constants/featureGating'

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

  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
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

    let skillPreferences: SkillPreference[] = []
    if (dbUser) {
      try {
        const prefs = await convex.query(api.skills.getSkillPreferences, {
          tenantId: dbUser.tenantId,
          userId: dbUser._id,
        })
        skillPreferences = prefs.map((p) => ({
          skillName: p.skillName,
          isEnabled: p.isEnabled,
          isPinned: p.isPinned,
        }))

        if (pinnedSkillIds && pinnedSkillIds.length > 0) {
          const pinnedLookup = new Set(pinnedSkillIds)
          const allChatSkills = await convex.query(api.skills.getAllSkillsForChat, {
            tenantId: dbUser.tenantId,
            userId: dbUser._id,
          })
          for (const cs of allChatSkills) {
            if (pinnedLookup.has(cs._id)) {
              const existing = skillPreferences.find(
                (p) => p.skillName.toLowerCase() === cs.name.toLowerCase()
              )
              if (existing) {
                existing.isPinned = true
              } else {
                skillPreferences.push({
                  skillName: cs.name,
                  isEnabled: true,
                  isPinned: true,
                })
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Chat API] Skill preferences fetch failed:', (err as Error)?.message ?? err)
      }
    }

    const [resolvedSkills, relevantContext, historyDocs, prospectsContext] = await Promise.all([
      resolveSkillsForMessage(message, skillPreferences, 5, skillScope).catch((err) => {
        console.warn('[Chat API] Skill retrieval failed (continuing without context):', (err as Error)?.message ?? err)
        return []
      }),
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
      `[Chat API] skills=${resolvedSkills.length > 0
        ? resolvedSkills.map((s) => `${s.skill.name} (${s.score.toFixed(2)})`).join(', ')
        : 'none'} | context=${relevantContext.length} docs | history=${historyDocs.length} msgs`
    )

    let connectedProviders: string[] = []
    if (dbUser) {
      try {
        const integrations = await convex.query(api.integrations.getIntegrationsByUserId, { userId: dbUser._id })
        connectedProviders = integrations
          .filter((i) => i.status === 'active')
          .map((i) => i.provider)
      } catch (err) {
        console.warn('[Chat API] Integration fetch failed:', (err as Error)?.message ?? err)
      }
    }

    console.log(`[Chat API] connectedProviders=${connectedProviders.join(', ') || 'none'}`)

    const skillsContext = buildSkillsSystemContext(resolvedSkills)
    const contextBlock = buildContextBlock(relevantContext)

    const agentMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []

    const systemParts = [skillsContext, contextBlock, prospectsContext].filter(Boolean)
    if (systemParts.length > 0) {
      agentMessages.push({ role: CHAT_ROLES.SYSTEM, content: systemParts.join('\n\n---\n\n') })
    }

    for (const doc of historyDocs) {
      if (doc.content === message && doc.role === CHAT_ROLES.USER) continue
      agentMessages.push({ role: doc.role as 'user' | 'assistant', content: doc.content })
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

      const mcpAgentIds = ['calendar', 'messaging', 'docs', 'crm', 'project', 'realEstate', 'finance', 'marketing'] as const
      const simpleAgentIds = ['email', 'research', 'linkedin', 'content', 'instagram', 'browser'] as const

      if (mcpAgentIds.includes(agentId as (typeof mcpAgentIds)[number])) {
        const createFns = {
          calendar: createCalendarAgent,
          messaging: createMessagingAgent,
          docs: createDocsAgent,
          crm: createCrmAgent,
          project: createProjectAgent,
          realEstate: createRealEstateAgent,
          finance: createFinanceAgent,
          marketing: createMarketingAgent,
        }
        const createFn = createFns[agentId as (typeof mcpAgentIds)[number]]
        if (createFn) {
          const { agent, toolsets } = await createFn(userId, connectedProviders)
          stream = await agent.stream(
            [{ role: 'user' as const, content: taskWithInstructions }],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { toolsets } as any
          )
        }
      } else if (simpleAgentIds.includes(agentId as (typeof simpleAgentIds)[number])) {
        const createFns = {
          email: createEmailAgent,
          research: createResearchAgent,
          linkedin: createLinkedInAgent,
          content: createContentAgent,
          instagram: createInstagramAgent,
          browser: createBrowserAgent,
        }
        const createFn = createFns[agentId as (typeof simpleAgentIds)[number]]
        if (createFn) {
          const agent = createFn(userId) as Agent
          stream = await agent.stream([{ role: 'user' as const, content: taskWithInstructions }])
        }
      }
    }

    if (stream === null && deepResearch) {
      console.log('[Chat API] Deep research mode enabled')
      const agent = createDeepResearchAgent(userId)
      stream = await agent.stream(agentMessages as Parameters<typeof agent.stream>[0])
    }

    if (stream === null) {
      const agent = createOrchestratorAgent(
        userId,
        convexTenantId ?? tenantId,
        agentInstructions,
        connectedProviders,
        model
      )
      stream = await agent.stream(agentMessages as Parameters<typeof agent.stream>[0])
    }

    let capturedUsage: { promptTokens?: number; completionTokens?: number } | null = null
    const aiStream = toAISdkStream(stream!, { from: 'agent' })

    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({
          type: 'data-skills',
          data: {
            type: 'skills',
            items: resolvedSkills.map(({ skill, score }) => ({
              id: skill.name,
              name: skill.name,
              score,
            })),
          },
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
