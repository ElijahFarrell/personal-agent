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
import { CHAT_JOB_STATUS } from '@convex/constants'

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

    const pipelineArgs = {
      message,
      threadId,
      userId,
      tenantId,
      agentInstructions,
      targetAgent,
      deepResearch,
      model,
    }

    if (background) {
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

      const tenantIdStr = tenantId
      const dbUserId = dbUser._id
      const dbTenantId = dbUser.tenantId

      after(async () => {
        try {
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
              toolCalls.length > 0
                ? {
                    toolCalls: toolCalls.map((tc) => ({
                      toolName: tc.toolName,
                      state: tc.state,
                      args: tc.args,
                      result: tc.result,
                    })),
                  }
                : undefined,
          })
          await convex.mutation(api.threads.touchThread, { threadId: threadId as Id<'threads'> })
          await convex.mutation(api.chatJobs.updateStatus, {
            jobId,
            status: CHAT_JOB_STATUS.COMPLETED,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Chat job failed'
          console.error('[Chat API] Background job error:', err)
          await convex.mutation(api.chatJobs.updateStatus, {
            jobId,
            status: CHAT_JOB_STATUS.FAILED,
            error: msg,
          })
        }
      })

      return NextResponse.json({ jobId, status: 'running' })
    }

    const { mastraStream } = await prepareChatAgentStream(pipelineArgs)

    let capturedUsage: { promptTokens?: number; completionTokens?: number } | null = null
    const aiStream = toAISdkStream(
      mastraStream as Parameters<typeof toAISdkStream>[0],
      { from: 'agent' }
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
