import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { toAISdkStream } from '@mastra/ai-sdk'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { createOrchestratorAgent } from '@/mastra'
import { retrieveRelevantSkills, buildSkillsContext, buildPinnedSkillsContext } from '@/skills/skillRetriever'
import { retrieveRelevantContext, buildContextBlock } from '@/services/contextService'
import { buildProspectsContext } from '@/services/prospectsContextService'
import { getTenantContext } from '@/middleware/tenantContext'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

export const maxDuration = 60

const HISTORY_LIMIT = 20

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

    const { threadId, agentInstructions, pinnedSkillIds, messages: uiMessages } = body as {
      threadId?: string
      agentInstructions?: Record<string, string>
      pinnedSkillIds?: string[]
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
    const { userId, tenantId } = tenantCtx

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
          action: 'chat_message',
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

    const [relevantSkills, relevantContext, historyDocs, prospectsContext] = await Promise.all([
      retrieveRelevantSkills(message, tenantId, dbUserId).catch((err) => {
        console.warn('[Chat API] Skill retrieval failed (continuing without context):', err?.message ?? err)
        if (err?.data) console.warn('[Chat API] Qdrant error detail:', JSON.stringify(err.data))
        return []
      }),
      retrieveRelevantContext(message, tenantId, dbUserId).catch((err) => {
        console.warn('[Chat API] Context retrieval failed (continuing without):', err?.message ?? err)
        return []
      }),
      threadId
        ? convex
            .query(api.messages.getMessagesByThreadId, { threadId, limit: HISTORY_LIMIT })
            .catch((err) => {
              console.warn('[Chat API] History fetch failed:', err?.message ?? err)
              return []
            })
        : Promise.resolve([]),
      buildProspectsContext(tenantId, dbUserId).catch((err) => {
        console.warn('[Chat API] Prospects context failed (continuing without):', (err as Error)?.message ?? err)
        return ''
      }),
    ])

    let allSkills = [...relevantSkills]
    if (pinnedSkillIds && pinnedSkillIds.length > 0 && dbUser) {
      try {
        const allVisibleSkills = await convex.query(api.skills.getAllSkillsForChat, {
          tenantId: dbUser.tenantId,
          userId: dbUser._id,
        })
        const pinned = allVisibleSkills.filter((s) => pinnedSkillIds.includes(s._id))
        const pinnedResults = buildPinnedSkillsContext(pinned)
        const existingIds = new Set(allSkills.map((s) => s.skill.id))
        for (const pr of pinnedResults) {
          if (!existingIds.has(pr.skill.id)) allSkills.push(pr)
        }
      } catch (err) {
        console.warn('[Chat API] Pinned skills fetch failed:', (err as Error)?.message ?? err)
      }
    }

    console.log(
      `[Chat API] skills=${allSkills.length > 0
        ? allSkills.map((s) => `${s.skill.name} (${s.score.toFixed(2)})`).join(', ')
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

    const skillsContext = buildSkillsContext(allSkills)
    const contextBlock = buildContextBlock(relevantContext)
    const agent = createOrchestratorAgent(userId, tenantId, agentInstructions, connectedProviders)

    const agentMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []

    const systemParts = [skillsContext, contextBlock, prospectsContext].filter(Boolean)
    if (systemParts.length > 0) {
      agentMessages.push({ role: 'system', content: systemParts.join('\n\n---\n\n') })
    }

    for (const doc of historyDocs) {
      if (doc.content === message && doc.role === 'user') continue
      agentMessages.push({ role: doc.role as 'user' | 'assistant', content: doc.content })
    }

    agentMessages.push({ role: 'user', content: message })

    if (dbUser) {
      convex
        .mutation(api.credits.deductCredits, {
          tenantId: dbUser.tenantId,
          userId: dbUser._id as Id<'users'>,
          action: 'chat_message',
        })
        .catch((err) => {
          console.warn('[Chat API] Credit deduction failed:', (err as Error)?.message ?? err)
        })
    }

    const result = await agent.stream(agentMessages as Parameters<typeof agent.stream>[0])

    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
        for await (const part of toAISdkStream(result, { from: 'agent' })) {
          await writer.write(part)
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
