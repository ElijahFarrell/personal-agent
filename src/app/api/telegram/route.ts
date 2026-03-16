import { NextRequest, NextResponse } from 'next/server'
import { Telegraf, type Context } from 'telegraf'
import type { NarrowedContext } from 'telegraf'
import type { Message, Update } from 'telegraf/types'
import { ConvexHttpClient } from 'convex/browser'
import { createOrchestratorAgent } from '@/mastra'
import {
  resolveSkillsForMessage,
  buildSkillsSystemContext,
  type SkillPreference,
} from '@/services/skillsService'
import { retrieveRelevantContext, buildContextBlock } from '@/services/contextService'
import { config } from '@/lib/config'
import { api } from '@convex/_generated/api'
import { CHAT_ROLES } from '@/constants/chat'

type TextContext = NarrowedContext<Context<Update>, Update.MessageUpdate<Message.TextMessage>>

const bot = new Telegraf(config.telegram.botToken)

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
const appUrl = config.app.url || process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'

bot.command('start', async (ctx) => {
  const payload = ctx.message.text?.replace(/^\/start\s*/, '').trim()
  if (payload) {
    const telegramUserId = ctx.from?.id?.toString()
    if (!telegramUserId) return

    const result = await convex.mutation(api.telegram.consumeLinkToken, {
      token: payload,
      telegramId: telegramUserId,
    })

    if (result.success) {
      await ctx.reply("You're connected! Send me a message and I'll get to work.")
    } else {
      await ctx.reply(result.error || 'Link expired or invalid. Please try again from the dashboard.')
    }
    return
  }

  await ctx.reply(
    `Hey! I'm your Personal AI OS.\n\nTo connect your account, open the Integrations page in the app and click Connect Telegram.\n\nIf you're already connected, send me a message and I'll get to work. Try:\n• "Check my email"\n• "Draft a LinkedIn post about AI"\n• "What's on my calendar today?"\n• "Brief me on my day"`
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

  const convexUser = await convex
    .query(api.users.getUserByTelegramId, { telegramId: telegramUserId })
    .catch(() => null)

  if (!convexUser) {
    await ctx.reply(
      `Please link your Telegram account first. Go to ${appUrl}/dashboard/integrations and click Connect Telegram.`
    )
    return
  }

  const tenant = await convex
    .query(api.tenants.getTenantById, { tenantId: convexUser.tenantId })
    .catch(() => null)
  if (!tenant) {
    await ctx.reply('Something went wrong. Please try again.')
    return
  }

  const userId = convexUser.clerkUserId
  const tenantId = tenant.clerkOrgId
  const dbUserId = String(convexUser._id)
  const skillScope = {
    tenantId: String(convexUser.tenantId),
    userId: dbUserId,
  }

  try {
    await ctx.sendChatAction('typing')

    let skillPreferences: SkillPreference[] = []
    try {
      const prefs = await convex.query(api.skills.getSkillPreferences, {
        tenantId: convexUser.tenantId,
        userId: convexUser._id,
      })
      skillPreferences = prefs.map((p) => ({
        skillName: p.skillName,
        isEnabled: p.isEnabled,
        isPinned: p.isPinned,
      }))
    } catch (err) {
      console.warn('[Telegram] Skill preferences fetch failed:', (err as Error)?.message ?? err)
    }

    const [resolvedSkills, relevantContext] = await Promise.all([
      resolveSkillsForMessage(messageText, skillPreferences, 5, skillScope).catch((err) => {
        console.warn('[Telegram] Skill retrieval failed (continuing without context):', (err as Error)?.message ?? err)
        return []
      }),
      retrieveRelevantContext(messageText, tenantId, dbUserId).catch((err) => {
        console.warn('[Telegram] Context retrieval failed (continuing without):', err?.message ?? err)
        return []
      }),
    ])

    const skillsContext = buildSkillsSystemContext(resolvedSkills)
    const contextBlock = buildContextBlock(relevantContext)
    const agent = createOrchestratorAgent(userId, tenantId)

    const systemParts = [skillsContext, contextBlock].filter(Boolean)
    const fullMessage =
      systemParts.length > 0
        ? `${systemParts.join('\n\n---\n\n')}\n\nUser: ${messageText}`
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
      role: CHAT_ROLES.USER,
      source: 'telegram',
      content: userMessage,
      threadId,
    })
    await convex.mutation(api.messages.saveMessage, {
      userId: convexUser._id,
      tenantId: convexUser.tenantId,
      role: CHAT_ROLES.ASSISTANT,
      source: 'telegram',
      content: assistantMessage,
      threadId,
    })
  } catch (err) {
    console.error('[Telegram] Failed to persist messages to Convex:', err)
  }
}

export const maxDuration = 60

const processedUpdates = new Set<number>()

/**
 * Webhook handler — Telegram sends POST requests to this endpoint.
 * Register webhook: https://api.telegram.org/bot{TOKEN}/setWebhook?url={YOUR_URL}/api/telegram
 *
 * Responds to Telegram immediately and processes the update in the background
 * to prevent Telegram's retry loop from firing duplicate requests.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const updateId = body.update_id as number | undefined
    if (updateId !== undefined) {
      if (processedUpdates.has(updateId)) {
        return NextResponse.json({ ok: true })
      }
      processedUpdates.add(updateId)
      if (processedUpdates.size > 1000) processedUpdates.clear()
    }

    void bot.handleUpdate(body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return NextResponse.json({ ok: true })
  }
}
