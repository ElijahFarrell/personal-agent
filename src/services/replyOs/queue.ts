import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { REPLY_TAG, TRIAGE_STATUS } from '@convex/constants'
import { formatPropertyCard } from './propertyCard'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export interface TravelQueueItem {
  triage: Doc<'replyTriage'>
  draft: Doc<'replyDrafts'> | null
  propertyCard: string
  threadSnippet: string
}

export async function getTravelQueue(
  tenantId: Id<'tenants'>,
  opts?: { tags?: Array<(typeof REPLY_TAG)[keyof typeof REPLY_TAG]>; limit?: number }
): Promise<TravelQueueItem[]> {
  const tags = opts?.tags ?? [REPLY_TAG.HUMAN_NOW, REPLY_TAG.DEAL]
  const limit = opts?.limit ?? 20
  const rows = await convex.query(api.replyTriage.listQueue, {
    tenantId,
    status: TRIAGE_STATUS.OPEN,
    tags,
    limit,
  })

  const items: TravelQueueItem[] = []
  for (const triage of rows) {
    const [draft, thread, property] = await Promise.all([
      convex.query(api.replyDrafts.latestForThread, {
        threadId: triage.threadId,
      }),
      convex.query(api.inbox.getThread, { threadId: triage.threadId }),
      triage.propertyId
        ? convex.query(api.properties.getById, { propertyId: triage.propertyId })
        : Promise.resolve(null),
    ])
    items.push({
      triage,
      draft,
      propertyCard: property ? formatPropertyCard(property) : '',
      threadSnippet: thread?.snippet ?? '',
    })
  }
  return items
}

export function buildTravelDigest(items: TravelQueueItem[]): string {
  const slice = items.slice(0, 3)
  if (slice.length === 0) return 'No seller replies need you right now.'

  return slice
    .map((item, index) => {
      const body = item.draft?.editedBody || item.draft?.body || '(no draft)'
      const card = item.propertyCard.replace(/\n/g, ' · ')
      return [
        `${index + 1}. ${item.triage.tag.toUpperCase()} — ${item.triage.reason}`,
        item.threadSnippet ? `Snippet: ${item.threadSnippet}` : null,
        card ? `Property: ${card}` : null,
        `Draft: ${body}`,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}
