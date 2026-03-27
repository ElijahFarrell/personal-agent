/**
 * Assembles thread + lead + research + org voice for inbox AI drafts.
 */
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { normalizeEmailPlainText } from '@/lib/inboxEmailText'
import { INBOX_PROVIDER } from '@convex/constants'
import { fetchLiveThreadMessages } from '@/services/inboxLiveMessagesService'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export interface ReplyContextInput {
  threadId: Id<'inboxThreads'>
  orgReplyVoice?: string
  clerkUserId: string
  userEmailLower: string
}

export async function buildReplyContextPrompt(input: ReplyContextInput): Promise<string> {
  const thread = await convex.query(api.inbox.getThread, { threadId: input.threadId })
  if (!thread) {
    throw new Error('Thread not found')
  }

  type Row = {
    who: string
    dir: 'outbound' | 'inbound'
    ts: string
    body: string
  }
  const rows: Row[] = []

  if (thread.provider === INBOX_PROVIDER.GMAIL || thread.provider === INBOX_PROVIDER.OUTLOOK) {
    const live = await fetchLiveThreadMessages(
      input.clerkUserId,
      thread.provider,
      thread.externalThreadId,
      input.userEmailLower
    )
    for (const m of live) {
      const who = m.fromEmail
      const dir = m.isOutbound ? ('outbound' as const) : ('inbound' as const)
      const ts = new Date(m.sentAt).toISOString()
      const body = normalizeEmailPlainText(m.bodyPlain).trim() || m.bodyPlain.trim() || '(No content)'
      rows.push({ who, dir, ts, body })
    }
  } else {
    const messages = await convex.query(api.inbox.listMessagesForThread, {
      threadId: input.threadId,
      limit: 200,
    })
    for (const m of messages ?? []) {
      const who = m.senderLabel || m.senderId || m.fromEmail
      const dir = m.isOutbound ? ('outbound' as const) : ('inbound' as const)
      const ts = new Date(m.sentAt).toISOString()
      const body =
        normalizeEmailPlainText(m.bodyPreview ?? '').trim() ||
        '(no message body in storage for this channel)'
      rows.push({ who, dir, ts, body })
    }
  }

  const lines: string[] = []
  lines.push('## Thread')
  lines.push(`Provider: ${thread.provider}`)
  lines.push(`Subject/title: ${thread.subject ?? '(none)'}`)
  lines.push(`Snippet: ${normalizeEmailPlainText(thread.snippet ?? '')}`)
  lines.push(`Needs reply: ${thread.needsReply ? 'yes' : 'no'}`)
  lines.push('')
  lines.push('## Messages (oldest → newest)')
  lines.push(
    thread.provider === INBOX_PROVIDER.WHATSAPP
      ? 'Each message includes text synced for this channel. Use quoted details when drafting.'
      : 'Each message includes the full conversation text loaded on demand via Composio (not truncated). Use quoted details when drafting.'
  )
  for (const m of rows) {
    lines.push('')
    lines.push(`### ${m.dir} · ${m.who} · ${m.ts}`)
    lines.push(m.body)
  }

  if (thread.prospectId) {
    const prospect = await convex.query(api.prospects.getProspect, {
      prospectId: thread.prospectId,
    })
    if (prospect) {
      lines.push('')
      lines.push('## Linked prospect')
      lines.push(`Name: ${prospect.name}`)
      if (prospect.company) lines.push(`Company: ${prospect.company}`)
      if (prospect.email) lines.push(`Email: ${prospect.email}`)
      if (prospect.phone) lines.push(`Phone: ${prospect.phone}`)
      lines.push(`Stage: ${prospect.stage ?? 'unknown'}`)
      lines.push(`Status: ${prospect.status}`)
      if (prospect.notes) lines.push(`Notes: ${prospect.notes}`)
    }

    const snap = await convex.query(api.prospects.getResearchSnapshot, {
      prospectId: thread.prospectId,
    })
    if (snap?.linkedinProfile || snap?.companyInfo) {
      lines.push('')
      lines.push('## Research snapshot')
      if (snap.linkedinProfile?.headline) {
        lines.push(`LinkedIn headline: ${snap.linkedinProfile.headline}`)
      }
      if (snap.linkedinProfile?.recentActivity) {
        lines.push(`Recent activity: ${snap.linkedinProfile.recentActivity}`)
      }
      if (snap.companyInfo?.summary) {
        lines.push(`Company: ${snap.companyInfo.summary}`)
      }
    }
  }

  if (input.orgReplyVoice?.trim()) {
    lines.push('')
    lines.push('## Our company voice (must match)')
    lines.push(input.orgReplyVoice.trim())
  }

  lines.push('')
  lines.push(
    '## Instructions for the draft\n' +
      'Reply must reference specific facts from the thread and prospect/company above. ' +
      'Do not use generic openers or template phrases unless the thread is empty. ' +
      'Match the requested tone from org voice when provided.'
  )

  return lines.join('\n')
}
