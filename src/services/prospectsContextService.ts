import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

interface ProspectDoc {
  _id: Id<'prospects'>
  name: string
  company?: string
  status: string
  stage: string
  ownerId?: Id<'users'>
  updatedAt: number
}

interface UserDoc {
  _id: Id<'users'>
  email: string
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  messaged: 'Messaged',
  follow_up: 'Follow Up Needed',
  meeting_booked: 'Meeting Booked',
  interested: 'Interested',
  dead: 'Dead',
  deal_open: 'Deal Open',
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

/**
 * Build a summary of the prospect pipeline for injection into the AI chat.
 * Groups prospects by stage, includes owner info, and provides aggregate stats.
 */
export async function buildProspectsContext(
  tenantId: Id<'tenants'>,
  currentUserId?: string
): Promise<string> {
  const [prospects, users] = await Promise.all([
    convex.query(api.prospects.getProspectsByTenantId, { tenantId }),
    convex.query(api.users.getUsersByTenantId, { tenantId }),
  ])

  if (!prospects || prospects.length === 0) return ''

  const userMap = new Map<string, UserDoc>()
  for (const u of users ?? []) {
    userMap.set(String(u._id), u as UserDoc)
  }

  const typedProspects = prospects as unknown as ProspectDoc[]

  const grouped = new Map<string, ProspectDoc[]>()
  for (const p of typedProspects) {
    const stage = p.stage ?? 'new'
    if (!grouped.has(stage)) grouped.set(stage, [])
    grouped.get(stage)!.push(p)
  }

  const stageOrder = ['new', 'messaged', 'follow_up', 'meeting_booked', 'interested', 'deal_open', 'dead']

  const sections: string[] = []
  const stageCounts: string[] = []

  let assignedToCurrentUser = 0
  let needsFollowUp = 0

  for (const stage of stageOrder) {
    const group = grouped.get(stage)
    if (!group || group.length === 0) continue

    stageCounts.push(`${group.length} ${STAGE_LABELS[stage]?.toLowerCase() ?? stage}`)

    const lines = group.slice(0, 10).map((p) => {
      const ownerStr = p.ownerId
        ? userMap.has(String(p.ownerId))
          ? String(p.ownerId) === currentUserId
            ? 'assigned to you'
            : `assigned to ${userMap.get(String(p.ownerId))!.email}`
          : 'assigned'
        : 'unassigned'

      if (String(p.ownerId) === currentUserId) assignedToCurrentUser++
      if (stage === 'follow_up' && String(p.ownerId) === currentUserId) needsFollowUp++

      return `- ${p.name}${p.company ? ` (${p.company})` : ''} — ${p.status}, updated ${timeAgo(p.updatedAt)}, ${ownerStr}`
    })

    if (group.length > 10) {
      lines.push(`- … and ${group.length - 10} more`)
    }

    sections.push(`### ${STAGE_LABELS[stage] ?? stage} (${group.length})\n${lines.join('\n')}`)
  }

  const yourSummary = currentUserId
    ? `\nYour prospects: ${assignedToCurrentUser} assigned to you${needsFollowUp > 0 ? ` (${needsFollowUp} need follow-up)` : ''}`
    : ''

  return `## Prospects Pipeline
You have access to the user's prospects pipeline. Use this to provide summaries, suggest follow-ups, and prioritize work.

${sections.join('\n\n')}
${yourSummary}
Total: ${typedProspects.length} prospects | ${stageCounts.join(' | ')}`
}
