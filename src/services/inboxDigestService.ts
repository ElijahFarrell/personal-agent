import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/** Compact triage block for orchestrator (not a substitute for per-thread ReplyContext). */
export async function buildInboxDigestForChat(userId: Id<'users'>): Promise<string> {
  const threads = await convex.query(api.inbox.listThreadsForUser, {
    userId,
    limit: 15,
    sortOrder: 'needs_reply_first',
  })
  if (!threads?.length) return ''

  const lines = ['## Unified inbox (recent)', '']
  for (const t of threads) {
    const tag = t.needsReply ? '[needs reply]' : ''
    lines.push(
      `- ${tag} [${t.provider}] ${t.subject ?? '(no subject)'} — ${(t.snippet ?? '').slice(0, 120)}`
    )
  }
  lines.push('')
  lines.push(
    'For drafting a reply to a specific thread, use the inbox UI or ask with enough detail; do not invent thread content beyond this list.'
  )
  return lines.join('\n')
}
