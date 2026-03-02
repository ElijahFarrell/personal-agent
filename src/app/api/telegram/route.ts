import { NextRequest, NextResponse } from 'next/server'
import { Telegraf, type Context } from 'telegraf'
import type { NarrowedContext } from 'telegraf'
import type { Message, Update } from 'telegraf/types'
import { ConvexHttpClient } from 'convex/browser'
import { createOrchestratorAgent } from '@/mastra'
import { retrieveRelevantSkills, buildSkillsContext } from '@/skills/skillRetriever'
import { getTelegramContext } from '@/middleware/tenantContext'
import { config } from '@/lib/config'
import { api } from '@convex/_generated/api'

type TextContext = NarrowedContext<Context<Update>, Update.MessageUpdate<Message.TextMessage>>

const bot = new Telegraf(config.telegram.botToken)

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

bot.command('start', async (ctx) => {
  await ctx.reply(
    `Hey! I'm your Personal AI OS.\n\nSend me a message and I'll get to work. Try:\n• "Check my email"\n• "Draft a LinkedIn post about AI"\n• "What's on my calendar today?"\n• "Brief me on my day"`
  )
})

bot.command('brief', async (ctx) => {
  await processMessage(ctx as unknown as TextContext, 'Generate my morning brief')
})

bot.on('text', async (ctx) => {
  await processMessage(ctx, ctx.message.text)
})

async function processMessage(ctx: TextContext, messageText: string): Promise<void> {
  const telegramUserId = ctx.from?.id?.toString()
  if (!telegramUserId || !messageText?.trim()) return

  const tenantCtx = getTelegramContext(telegramUserId)
  const { userId, tenantId } = tenantCtx

  try {
    await ctx.sendChatAction('typing')

    // Resolve Convex user for scope-aware skill retrieval
    const convexUser = await convex
      .query(api.users.getUserByTelegramId, { telegramId: telegramUserId })
      .catch(() => null)
    const dbUserId = convexUser?._id ? String(convexUser._id) : undefined

    const relevantSkills = await retrieveRelevantSkills(messageText, tenantId, dbUserId).catch((err) => {
      console.warn('[Telegram] Skill retrieval failed (continuing without context):', err?.message ?? err)
      return []
    })

    const skillsContext = buildSkillsContext(relevantSkills)
    const agent = createOrchestratorAgent(userId, tenantId)

    const fullMessage = skillsContext
      ? `${skillsContext}\n\n---\n\nUser: ${messageText}`
      : messageText

    const result = await agent.generate(fullMessage)
    const text = result.text

    if (text.length <= 4096) {
      await ctx.reply(text)
    } else {
      const chunks = text.match(/.{1,4000}/gs) ?? [text]
      for (const chunk of chunks) {
        await ctx.reply(chunk)
      }
    }

    // Persist messages to Convex for cross-source sync (best effort)
    void persistTelegramMessages(telegramUserId, messageText, text)
  } catch (error) {
    console.error('[Telegram] Error:', error)
    await ctx.reply('Something went wrong. Please try again.')
  }
}

async function persistTelegramMessages(
  telegramUserId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  try {
    const convexUser = await convex.query(api.users.getUserByTelegramId, { telegramId: telegramUserId })
    if (!convexUser) return

    const threadId = `telegram-${telegramUserId}`

    // Insert sequentially so user message gets a lower createdAt than assistant
    await convex.mutation(api.messages.saveMessage, {
      userId: convexUser._id,
      tenantId: convexUser.tenantId,
      role: 'user',
      source: 'telegram',
      content: userMessage,
      threadId,
    })
    await convex.mutation(api.messages.saveMessage, {
      userId: convexUser._id,
      tenantId: convexUser.tenantId,
      role: 'assistant',
      source: 'telegram',
      content: assistantMessage,
      threadId,
    })
  } catch (err) {
    console.error('[Telegram] Failed to persist messages to Convex:', err)
  }
}

/**
 * Webhook handler — Telegram sends POST requests to this endpoint.
 * Register webhook: https://api.telegram.org/bot{TOKEN}/setWebhook?url={YOUR_URL}/api/telegram
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await bot.handleUpdate(body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return NextResponse.json({ error: 'Failed to process update' }, { status: 500 })
  }
}
