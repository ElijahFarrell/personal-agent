import { NextRequest, NextResponse } from 'next/server'
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  type UIMessage,
} from 'ai'
import { toAISdkStream } from '@mastra/ai-sdk'
import { ConvexHttpClient } from 'convex/browser'
import { createMarketingChatAgent } from '@/mastra/agents/marketingChatAgent'
import {
  retrieveMarketingContext,
  buildMarketingContextBlock,
} from '@/services/marketingKnowledgeService'
import { validateInput } from '@/lib/marketingChatGuardrails'

export const maxDuration = 60

// ─── Rate Limiter (in-memory, per-instance) ─────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 30

const ipHits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > MAX_REQUESTS_PER_WINDOW
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of ipHits) {
      if (now > entry.resetAt) ipHits.delete(ip)
    }
  }, 5 * 60 * 1000)
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { messages, sessionId } = body as {
      messages?: UIMessage[]
      sessionId?: string
    }

    if (!messages?.length) {
      return NextResponse.json(
        { error: 'No messages provided.' },
        { status: 400 }
      )
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')

    const userText = (() => {
      if (!lastUserMsg?.parts?.length) return ''
      return lastUserMsg.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join(' ')
    })()

    const guardrail = validateInput(userText, messages.length)
    if (!guardrail.allowed) {
      return NextResponse.json({ error: guardrail.reason }, { status: 400 })
    }

    const ragResults = await retrieveMarketingContext(userText).catch(() => [])
    const contextBlock = buildMarketingContextBlock(ragResults)

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null

    const agent = createMarketingChatAgent(contextBlock, {
      convex,
      sessionId: sessionId || 'unknown',
      ip,
    })

    const modelMessages = await convertToModelMessages(messages)

    const mastraStream = await agent.stream(
      modelMessages as Parameters<typeof agent.stream>[0],
      { maxSteps: 5 }
    )

    const uiStream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        for await (const part of toAISdkStream(mastraStream, { from: 'agent' })) {
          await writer.write(part)
        }
      },
    })

    return createUIMessageStreamResponse({ stream: uiStream })
  } catch (error) {
    console.error('[marketing-chat] Error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
