import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { createOrchestratorAgent } from '@/mastra'
import { retrieveRelevantSkills, buildSkillsContext, buildPinnedSkillsContext } from '@/skills/skillRetriever'
import { retrieveRelevantContext, buildContextBlock } from '@/services/contextService'
import { getTenantContext } from '@/middleware/tenantContext'
import { api } from '@convex/_generated/api'
import type { ChatRequest } from '@/types'

export const maxDuration = 60

const HISTORY_LIMIT = 20

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ChatRequest>
    const { message, threadId, agentInstructions, pinnedSkillIds } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const tenantCtx = await getTenantContext()
    const { userId, tenantId } = tenantCtx

    console.log(`[Chat API] tenantId=${tenantId} | userId=${userId} | threadId=${threadId ?? 'none'}`)

    // Resolve Convex user early so we can use the DB user ID for scoped queries
    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch((err) => {
        console.warn('[Chat API] DB user lookup failed:', (err as Error)?.message ?? err)
        return null
      })

    const dbUserId = dbUser?._id ? String(dbUser._id) : undefined

    const [relevantSkills, relevantContext, historyDocs] = await Promise.all([
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
    ])

    // Merge pinned skills (user-forced) with auto-retrieved skills, deduplicating
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

    const skillsContext = buildSkillsContext(allSkills)
    const contextBlock = buildContextBlock(relevantContext)
    const agent = createOrchestratorAgent(userId, tenantId, agentInstructions, connectedProviders)

    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []

    const systemParts = [skillsContext, contextBlock].filter(Boolean)
    if (systemParts.length > 0) {
      messages.push({ role: 'system', content: systemParts.join('\n\n---\n\n') })
    }

    for (const doc of historyDocs) {
      if (doc.content === message && doc.role === 'user') continue
      messages.push({ role: doc.role as 'user' | 'assistant', content: doc.content })
    }

    messages.push({ role: 'user', content: message })

    const result = await agent.stream(messages as Parameters<typeof agent.stream>[0])

    return new Response(result.textStream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('[Chat API] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
