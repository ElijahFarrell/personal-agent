import { NextRequest, NextResponse } from 'next/server'
import { executeMorningBrief } from '@/mastra/workflows/morningBrief'
import { PERSONAL_CONTEXT } from '@/middleware/tenantContext'
import { config } from '@/lib/config'
import { Telegraf } from 'telegraf'

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)
  const signingKey = config.inngest.signingKey
  const cronSecret = config.cron.secret

  if (signingKey && token === signingKey) return true
  if (cronSecret && token === cronSecret) return true
  return false
}

function formatBriefForTelegram(brief: {
  greeting: string
  topPriority: string
  schedule: string
  actionItems: string[]
}): string {
  const items = brief.actionItems.map((i) => `• ${i}`).join('\n')
  return [
    brief.greeting,
    '',
    `🎯 **Top Priority:** ${brief.topPriority}`,
    '',
    `📅 **Schedule:** ${brief.schedule}`,
    '',
    '**Action Items:**',
    items,
  ].join('\n')
}

/**
 * GET handler for morning brief cron.
 * Protected by Authorization: Bearer <INNGEST_SIGNING_KEY|CRON_SECRET>.
 * Triggers morning brief for the owner (PERSONAL_CONTEXT).
 * Optionally sends result via Telegram if TELEGRAM_BOT_TOKEN and TELEGRAM_OWNER_ID are set.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, tenantId } = PERSONAL_CONTEXT

  try {
    const brief = await executeMorningBrief(userId, tenantId)

    if (config.telegram.botToken && config.telegram.ownerId) {
      try {
        const bot = new Telegraf(config.telegram.botToken)
        const message = formatBriefForTelegram(brief)
        await bot.telegram.sendMessage(config.telegram.ownerId, message, {
          parse_mode: 'Markdown',
        })
      } catch (telegramError) {
        console.error('[Morning Brief Cron] Telegram send failed:', telegramError)
      }
    }

    return NextResponse.json(brief)
  } catch (error) {
    console.error('[Morning Brief Cron] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
