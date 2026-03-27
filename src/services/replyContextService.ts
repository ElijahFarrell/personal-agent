/**
 * Assembles thread + lead + research + org voice for inbox AI drafts.
 */
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export interface ReplyContextInput {
  threadId: Id<'inboxThreads'>
  orgReplyVoice?: string
}

export async function buildReplyContextPrompt(input: ReplyContextInput): Promise<string> {
  const thread = await convex.query(api.inbox.getThread, { threadId: input.threadId })
  if (!thread) {
    throw new Error('Thread not found')
  }

  const messages = await convex.query(api.inbox.listMessagesForThread, {
    threadId: input.threadId,
    limit: 200,
  })

  const lines: string[] = []
  lines.push('## Thread')
  lines.push(`Provider: ${thread.provider}`)
  lines.push(`Subject/title: ${thread.subject ?? '(none)'}`)
  lines.push(`Snippet: ${thread.snippet ?? ''}`)
  lines.push(`Needs reply: ${thread.needsReply ? 'yes' : 'no'}`)
  lines.push('')
  lines.push('## Messages (oldest → newest)')
  for (const m of messages ?? []) {
    const who = m.senderLabel || m.senderId || m.fromEmail
    const dir = m.isOutbound ? 'outbound' : 'inbound'
    lines.push(
      `- [${dir}] ${new Date(m.sentAt).toISOString()} from ${who}: ${m.bodyPreview}`
    )
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
