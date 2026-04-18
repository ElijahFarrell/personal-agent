import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { toAISdkStream } from '@mastra/ai-sdk'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { ConvexHttpClient } from 'convex/browser'
import { getTenantContext } from '@/middleware/tenantContext'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { CHAT_ROLES, CHAT_SOURCES } from '@/constants/chat'
import { milestoneLineForTool } from '@/constants/chatToolUi'
import {
  isAgentAllowed,
  isFeatureEnabled,
} from '@/constants/featureGating'
import {
  prepareChatAgentStream,
  consumeMastraStreamToResult,
} from '@/services/chatPipeline'
import { CHAT_CREDIT_ACTION } from '@/constants/chat'
import { AGENT_RUN_STATUS, CHAT_JOB_STATUS } from '@convex/constants'
import { shouldPromoteLongRunning } from '@/mastra/tools/longRunningRegistry'
import { observeRun } from '@/mastra/agents/durableAgent'

// Next.js `maxDuration` is module-level, so the route exposes one budget for
// both the streaming foreground branch and the auto-promoted background
// branch. Background runs kick off a long-running Convex worker and return
// almost immediately, but the in-route work (creating chatJobs + agentRuns,
// starting the worker, tailing SSE from /api/chat?observe=<runId>) can still
// sit open for the full Exa webset window. 800s matches the Convex worker
// max-attempts ceiling (60 × 15s ≈ 15 min) with headroom.
export const maxDuration = 800

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Extract the latest user message text and image attachment URLs.
 * Supports AI SDK v6 UIMessage[] (text + file parts), optional `attachmentUrls` on the body
 * (background jobs), and plain `message` for backward compatibility.
 */
function extractChatRequest(body: Record<string, unknown>): {
  text: string | null
  attachmentUrls: string[]
} {
  const fromBody = body.attachmentUrls
  const extraUrls = Array.isArray(fromBody)
    ? fromBody.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : []

  let text: string | null = null
  const attachmentUrls: string[] = [...extraUrls]

  const messageFromBody =
    typeof body.message === 'string' && body.message.trim() ? body.message.trim() : null

  const messages = body.messages as Array<{
    role: string
    parts?: Array<{
      type: string
      text?: string
      url?: string
      mediaType?: string
      mimeType?: string
    }>
    content?: string
  }> | undefined

  if (messages?.length) {
    const lastUser = [...messages].reverse().find((m) => m.role === CHAT_ROLES.USER)
    if (lastUser?.parts) {
      if (!messageFromBody) {
        const texts = lastUser.parts
          .filter((p) => p.type === 'text' && p.text?.trim())
          .map((p) => p.text!.trim())
        if (texts.length) text = texts.join('\n')
      }

      for (const p of lastUser.parts) {
        if (p.type === 'file' && typeof p.url === 'string') {
          const mime = (p.mediaType ?? p.mimeType ?? '').toLowerCase()
          if (mime.startsWith('image/')) {
            attachmentUrls.push(p.url)
          }
        }
      }
    }
    if (!text && !messageFromBody && typeof lastUser?.content === 'string' && lastUser.content.trim()) {
      text = lastUser.content.trim()
    }
  }

  if (messageFromBody) {
    text = messageFromBody
  }

  const mergedUrls = [...new Set(attachmentUrls)]

  if (!text?.trim() && mergedUrls.length > 0) {
    text = 'Please analyze the attached image(s).'
  }

  return { text: text?.trim() ?? null, attachmentUrls: mergedUrls }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      threadId,
      agentInstructions,
      targetAgent,
      deepResearch,
      model,
      messages: uiMessages,
      background,
    } = body as {
      threadId?: string
      agentInstructions?: Record<string, string>
      pinnedSkillIds?: string[]
      targetAgent?: string
      deepResearch?: boolean
      model?: string
      messages?: unknown[]
      background?: boolean
      attachmentUrls?: string[]
    }

    console.log('[Chat API] Body keys:', Object.keys(body), '| messages count:', uiMessages?.length ?? 0)

    const { text: message, attachmentUrls } = extractChatRequest(body)
    if (!message) {
      console.warn('[Chat API] Could not extract message. Body sample:', JSON.stringify(body).slice(0, 500))
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    console.log('[Chat API] Extracted message:', message.slice(0, 100), '| images:', attachmentUrls.length)

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

    let effectiveAgentInstructions = agentInstructions
    if (dbUser) {
      const stored = await convex
        .query(api.userAgentSettings.getByUserId, { userId: dbUser._id })
        .catch(() => null)
      if (stored?.instructionsByAgentId && Object.keys(stored.instructionsByAgentId).length > 0) {
        effectiveAgentInstructions = stored.instructionsByAgentId
      }
    }

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

    const pipelineArgs = {
      message,
      attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
      threadId,
      userId,
      tenantId,
      agentInstructions: effectiveAgentInstructions,
      targetAgent,
      deepResearch,
      model,
    }

    // Auto-promote to background when the user message hints at a tool that
    // routinely outlives the serverless budget. Requires a signed-in user and
    // persisted thread — otherwise we fall back to the streaming branch and
    // accept the risk of timeout.
    const autoPromote =
      !background && Boolean(dbUser && threadId) && shouldPromoteLongRunning(message)
    const runInBackground = background || autoPromote

    if (runInBackground) {
      if (!dbUser || !threadId) {
        return NextResponse.json(
          { error: 'Background mode requires a saved thread and signed-in user.' },
          { status: 400 }
        )
      }

      const jobId = await convex.mutation(api.chatJobs.create, {
        threadId,
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
      })

      await convex.mutation(api.chatJobs.updateStatus, {
        jobId,
        status: CHAT_JOB_STATUS.RUNNING,
      })

      const runId = await convex.mutation(api.agentRuns.create, {
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
        agentId: 'orchestrator',
        threadId,
        title: message.slice(0, 120),
        input: {
          message,
          attachmentUrls: pipelineArgs.attachmentUrls,
          targetAgent,
          deepResearch: Boolean(deepResearch),
        },
        tracingTags: autoPromote ? ['auto-promoted:long-running'] : undefined,
      })

      const tenantIdStr = tenantId
      const dbUserId = dbUser._id
      const dbTenantId = dbUser.tenantId

      after(async () => {
        try {
          await convex.mutation(api.agentRuns.updateStatus, {
            runId,
            status: 'running',
          })
          const { mastraStream } = await prepareChatAgentStream(pipelineArgs)
          const { text, toolCalls } = await consumeMastraStreamToResult(mastraStream)
          await convex.mutation(api.messages.saveMessage, {
            userId: dbUserId,
            tenantId: dbTenantId,
            role: CHAT_ROLES.ASSISTANT,
            source: CHAT_SOURCES.WEB,
            content: text || '(No text response)',
            threadId,
            metadata:
              toolCalls.length > 0 ||
              pipelineArgs.deepResearch ||
              pipelineArgs.targetAgent
                ? {
                    ...(toolCalls.length > 0
                      ? {
                          toolCalls: toolCalls.map((tc) => ({
                            toolName: tc.toolName,
                            state: tc.state,
                            args: tc.args,
                            result: tc.result,
                          })),
                        }
                      : {}),
                    ...(pipelineArgs.deepResearch ? { deepResearch: true as const } : {}),
                    ...(pipelineArgs.targetAgent
                      ? { targetAgent: pipelineArgs.targetAgent }
                      : {}),
                  }
                : undefined,
          })
          await convex.mutation(api.threads.touchThread, { threadId: threadId as Id<'threads'> })
          await convex.mutation(api.chatJobs.updateStatus, {
            jobId,
            status: CHAT_JOB_STATUS.COMPLETED,
          })
          await convex.mutation(api.agentRuns.updateStatus, {
            runId,
            status: 'completed',
            output: { text, toolCallCount: toolCalls.length },
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Chat job failed'
          console.error('[Chat API] Background job error:', err)
          await convex.mutation(api.chatJobs.updateStatus, {
            jobId,
            status: CHAT_JOB_STATUS.FAILED,
            error: msg,
          })
          await convex
            .mutation(api.agentRuns.updateStatus, {
              runId,
              status: AGENT_RUN_STATUS.FAILED,
              error: msg,
            })
            .catch(() => {})
        }
      })

      return NextResponse.json({
        jobId,
        runId,
        status: 'running',
        autoPromoted: autoPromote,
      })
    }

    const { mastraStream } = await prepareChatAgentStream(pipelineArgs)

    let capturedUsage: { promptTokens?: number; completionTokens?: number } | null = null
    const aiStream = toAISdkStream(
      mastraStream as Parameters<typeof toAISdkStream>[0],
      { from: 'agent', sendReasoning: true }
    )

    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({
          type: 'data-skills',
          data: { type: 'skills', items: [] },
        })
        writer.write({
          type: 'data-chat-phase',
          data: { phase: 'preparing', label: 'Preparing context and connections…' },
        })
        for await (const part of aiStream as AsyncIterable<{
          type?: string
          usage?: { promptTokens?: number; completionTokens?: number }
        }>) {
          const p = part as Record<string, unknown>
          if (p?.type === 'tool-input-start' && typeof p.toolName === 'string') {
            const line = milestoneLineForTool(p.toolName)
            if (line) {
              writer.write({
                type: 'data-chat-milestone',
                data: { label: line, toolName: p.toolName },
              })
            }
          }
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

/**
 * Reconnect to a background/auto-promoted run as a Server-Sent Events stream.
 *
 * Usage: `GET /api/chat?observe=<runId>` — returns `text/event-stream` with
 * `status`, `progress`, `done`, `timeout`, and `error` events. This is the
 * durable equivalent of Mastra's native `agent.observe(runId)` pattern; the
 * browser can call it freely after a page refresh because all state lives in
 * Convex (agentRuns + runProgress).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const runIdParam = url.searchParams.get('observe')
  if (!runIdParam) {
    return NextResponse.json(
      { error: 'Missing `observe` query parameter (runId).' },
      { status: 400 }
    )
  }

  try {
    const { tenantId } = await getTenantContext()
    const runId = runIdParam as Id<'agentRuns'>

    const run = await convex.query(api.agentRuns.getById, { runId })
    if (!run) {
      return NextResponse.json({ error: 'Run not found.' }, { status: 404 })
    }
    if (String(run.tenantId) !== tenantId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const stream = observeRun({ runId, tenantId })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[Chat API] Observe error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
