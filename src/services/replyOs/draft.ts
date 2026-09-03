import { readFile } from 'fs/promises'
import { join } from 'path'
import { Agent } from '@mastra/core/agent'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { DRAFT_STATUS, PROPERTY_KIND } from '@convex/constants'
import { AgentModels } from '@/constants/models'
import { SellerReplyDraftSchema } from '@/mastra/agents/schemas'
import { SELLER_REPLY_DRAFT_PROMPT } from '@/mastra/prompts/sellerReplyDraft'
import { buildReplyContextPrompt } from '@/services/replyContextService'
import { formatPropertyCard } from './propertyCard'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
const SMS_MAX_CHARS = 320

async function loadPlaybook(kind: Doc<'properties'>['kind']): Promise<string> {
  const file =
    kind === PROPERTY_KIND.LAND
      ? 'seller-reply-playbook-land.md'
      : 'seller-reply-playbook-wholesale.md'
  const path = join(process.cwd(), 'skills/niches/real_estate', file)
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

function clipSms(body: string): string {
  const trimmed = body.trim()
  if (trimmed.length <= SMS_MAX_CHARS) return trimmed
  return trimmed.slice(0, SMS_MAX_CHARS).trim()
}

export async function draftSellerReply(args: {
  tenantId: Id<'tenants'>
  userId: string
  thread: Doc<'inboxThreads'>
  triage: Doc<'replyTriage'>
  property: Doc<'properties'>
}): Promise<Id<'replyDrafts'> | null> {
  const config = await convex.query(api.tenantConfigs.getByTenantId, {
    tenantId: args.tenantId,
  })
  const dbUser = await convex.query(api.users.getUserByClerkUserId, {
    clerkUserId: args.userId,
  })
  if (!dbUser) return null

  const [contextBlock, playbook] = await Promise.all([
    buildReplyContextPrompt({
      threadId: args.thread._id,
      orgReplyVoice: config?.orgReplyVoice,
      clerkUserId: args.userId,
      userEmailLower: dbUser.email.toLowerCase().trim(),
    }),
    loadPlaybook(args.property.kind),
  ])

  const agent = new Agent({
    id: `seller-reply-draft-${args.userId}`,
    name: 'sellerReplyDraft',
    instructions: SELLER_REPLY_DRAFT_PROMPT,
    model: AgentModels.email(),
  })

  const prompt = [
    playbook ? `## Playbook\n${playbook}` : '',
    `## Property\n${formatPropertyCard(args.property)}`,
    `## Tag: ${args.triage.tag} (${args.triage.reason})`,
    args.triage.extracted.askingPrice !== undefined
      ? `Seller mentioned asking price: ${args.triage.extracted.askingPrice}`
      : 'Do not invent a price.',
    '',
    contextBlock,
  ]
    .filter(Boolean)
    .join('\n')

  const result = await agent.generate(prompt, {
    structuredOutput: { schema: SellerReplyDraftSchema },
  })
  const parsed = SellerReplyDraftSchema.safeParse(result.object)
  const body = clipSms(parsed.success ? parsed.data.body : result.text || '')
  if (!body) return null

  return await convex.mutation(api.replyDrafts.create, {
    tenantId: args.tenantId,
    threadId: args.thread._id,
    triageId: args.triage._id,
    propertyId: args.property._id,
    body,
    status: DRAFT_STATUS.PENDING_REVIEW,
    model: 'email',
  })
}
