import { ConvexHttpClient } from 'convex/browser'
import { toAISdkStream } from '@mastra/ai-sdk'
import { readUIMessageStream, getToolName, isTextUIPart, isToolUIPart } from 'ai'
import type { UIMessage } from 'ai'
import {
  createOrchestratorAgent,
  createEmailAgent,
  createResearchAgent,
  createDeepResearchAgent,
  createCalendarAgent,
  createLinkedInAgent,
  createContentAgent,
  createInstagramAgent,
  createBrowserAgent,
  createMessagingAgent,
  createDocsAgent,
  createCrmAgent,
  createProjectAgent,
  createRealEstateAgent,
  createFinanceAgent,
  createMarketingAgent,
  createMetaAdsAgent,
  createAdsScraperAgent,
  createAdAnalyzerAgent,
  createCampaignBuilderAgent,
} from '@/mastra'
import { ADS_AGENT_GENERATE_OPTS } from '@/mastra/agents/adsAgentOptions'
import { retrieveRelevantContext, buildContextBlock } from '@/services/contextService'
import { createWorkspaceForTenant } from '@/mastra/createWorkspaceForTenant'
import { buildProspectsContext } from '@/services/prospectsContextService'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AGENT_BY_ID, type AgentId } from '@/constants/agents'
import { CHAT_CREDIT_ACTION, CHAT_LIMITS, CHAT_ROLES, type AgentMessage } from '@/constants/chat'
import { getComposioConnectionStatus } from '@/lib/composio'
import type { Agent } from '@mastra/core/agent'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export interface ChatPipelineArgs {
  message: string
  threadId?: string
  userId: string
  tenantId: string
  agentInstructions?: Record<string, string>
  targetAgent?: string
  deepResearch?: boolean
  model?: string
}

export interface PreparedDbUser {
  _id: Id<'users'>
  tenantId: Id<'tenants'>
  clerkUserId?: string
}

/**
 * Builds the Mastra agent stream (same logic as POST /api/chat).
 * Caller handles streaming to the client or consuming for background jobs.
 */
export async function prepareChatAgentStream(
  args: ChatPipelineArgs
): Promise<{ mastraStream: unknown; dbUser: PreparedDbUser | null }> {
  const { message, threadId, userId, tenantId, agentInstructions, targetAgent, deepResearch, model } =
    args

  const dbUser = await convex
    .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
    .catch(() => null)

  const dbUserId = dbUser?._id ? String(dbUser._id) : undefined
  const convexTenantId =
    dbUser?.tenantId ??
    (await convex.query(api.tenants.getTenantByClerkOrgId, { clerkOrgId: tenantId }).catch(() => null))
      ?._id

  const skillScope = dbUser
    ? {
        tenantId: String(dbUser.tenantId),
        userId: String(dbUser._id),
      }
    : undefined

  const workspace = skillScope
    ? await createWorkspaceForTenant(skillScope.tenantId, skillScope.userId)
    : undefined

  const [relevantContext, historyDocs, prospectsContext] = await Promise.all([
    retrieveRelevantContext(message, tenantId, dbUserId).catch(() => []),
    threadId
      ? convex
          .query(api.messages.getMessagesByThreadId, { threadId, limit: CHAT_LIMITS.HISTORY_LIMIT })
          .catch(() => [])
      : Promise.resolve([]),
    dbUser
      ? buildProspectsContext(dbUser.tenantId, dbUserId).catch(() => '')
      : Promise.resolve(''),
  ])

  let connectedProviders: string[] = []
  if (dbUser) {
    try {
      const composioStatus = await getComposioConnectionStatus(userId)
      connectedProviders = (Object.entries(composioStatus) as [string, boolean][])
        .filter(([, connected]) => connected)
        .map(([provider]) => provider)
    } catch {
      // ignore
    }
  }

  const contextBlock = buildContextBlock(relevantContext)

  const agentMessages: AgentMessage[] = []

  const systemParts = [contextBlock, prospectsContext].filter(Boolean)
  if (systemParts.length > 0) {
    agentMessages.push({ role: CHAT_ROLES.SYSTEM, content: systemParts.join('\n\n---\n\n') })
  }

  for (const doc of historyDocs) {
    if (doc.content === message && doc.role === CHAT_ROLES.USER) continue
    agentMessages.push({ role: doc.role as AgentMessage['role'], content: doc.content })
  }

  agentMessages.push({ role: CHAT_ROLES.USER, content: message })

  if (dbUser) {
    convex
      .mutation(api.credits.deductCredits, {
        tenantId: dbUser.tenantId,
        userId: dbUser._id as Id<'users'>,
        action: CHAT_CREDIT_ACTION,
      })
      .catch(() => {})
  }

  let stream: unknown | null = null
  const instructions = agentInstructions ?? {}
  const meta = targetAgent ? AGENT_BY_ID.get(targetAgent as AgentId) : undefined

  if (meta) {
    const agentId = meta.id
    const agentInstructionsForTarget = instructions[agentId] ?? instructions[meta.toolId] ?? undefined
    const taskWithInstructions = agentInstructionsForTarget?.trim()
      ? `[Custom instructions: ${agentInstructionsForTarget.trim()}]\n\n${message}`
      : message

    const composioAgentIds = [
      'email',
      'calendar',
      'messaging',
      'docs',
      'crm',
      'project',
      'realEstate',
      'finance',
      'marketing',
      'metaAds',
      'adsScraper',
      'adAnalyzer',
      'campaignBuilder',
    ] as const
    const adsIntelAgentIds = ['adsScraper', 'adAnalyzer', 'campaignBuilder'] as const
    const simpleAgentIds = ['research', 'linkedin', 'content', 'instagram', 'browser'] as const

    if (composioAgentIds.includes(agentId as (typeof composioAgentIds)[number])) {
      const createFns = {
        email: createEmailAgent,
        calendar: createCalendarAgent,
        messaging: createMessagingAgent,
        docs: createDocsAgent,
        crm: createCrmAgent,
        project: createProjectAgent,
        realEstate: createRealEstateAgent,
        finance: createFinanceAgent,
        marketing: createMarketingAgent,
        metaAds: createMetaAdsAgent,
        adsScraper: createAdsScraperAgent,
        adAnalyzer: createAdAnalyzerAgent,
        campaignBuilder: createCampaignBuilderAgent,
      }
      const createFn = createFns[agentId as (typeof composioAgentIds)[number]]
      if (createFn) {
        const { agent, toolsets } = await createFn(userId, connectedProviders, workspace)
        const agentMessagesWithTask = [...agentMessages]
        const lastIdx = agentMessagesWithTask.length - 1
        if (lastIdx >= 0 && agentMessagesWithTask[lastIdx]?.role === CHAT_ROLES.USER) {
          agentMessagesWithTask[lastIdx] = { role: CHAT_ROLES.USER, content: taskWithInstructions }
        }
        const useAdsIntelOpts = adsIntelAgentIds.includes(
          agentId as (typeof adsIntelAgentIds)[number]
        )
        stream = await agent.stream(
          agentMessagesWithTask as Parameters<typeof agent.stream>[0],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {
            toolsets,
            ...(useAdsIntelOpts ? ADS_AGENT_GENERATE_OPTS : {}),
          } as any
        )
      }
    } else if (simpleAgentIds.includes(agentId as (typeof simpleAgentIds)[number])) {
      const draftScope = skillScope ? { tenantId: skillScope.tenantId, userId: skillScope.userId } : undefined
      let agent: Agent
      if (agentId === 'content') {
        agent = await createContentAgent(userId, draftScope, workspace)
      } else {
        const createFns = {
          research: createResearchAgent,
          linkedin: createLinkedInAgent,
          instagram: createInstagramAgent,
          browser: createBrowserAgent,
        }
        const createFn = createFns[agentId as keyof typeof createFns]
        agent = createFn(userId, workspace) as Agent
      }
      const agentMessagesWithTask = [...agentMessages]
      const lastIdx = agentMessagesWithTask.length - 1
      if (lastIdx >= 0 && agentMessagesWithTask[lastIdx]?.role === CHAT_ROLES.USER) {
        agentMessagesWithTask[lastIdx] = { role: CHAT_ROLES.USER, content: taskWithInstructions }
      }
      stream = await agent.stream(agentMessagesWithTask as Parameters<typeof agent.stream>[0])
    }
  }

  if (stream === null && deepResearch) {
    const agent = createDeepResearchAgent(userId)
    stream = await agent.stream(agentMessages as Parameters<typeof agent.stream>[0])
  }

  if (stream === null) {
    const agent = await createOrchestratorAgent(
      userId,
      convexTenantId ?? tenantId,
      agentInstructions,
      connectedProviders,
      model,
      skillScope
    )
    stream = await agent.stream(agentMessages as Parameters<typeof agent.stream>[0])
  }

  return { mastraStream: stream!, dbUser }
}

export interface ConsumedToolCall {
  toolName: string
  state: string
  args?: Record<string, unknown>
  result?: unknown
}

/**
 * Drains a Mastra agent stream to final text + tool call metadata (for background jobs).
 */
export async function consumeMastraStreamToResult(mastraStream: unknown): Promise<{
  text: string
  toolCalls: ConsumedToolCall[]
}> {
  const aiStream = toAISdkStream(
    mastraStream as Parameters<typeof toAISdkStream>[0],
    { from: 'agent', sendReasoning: true }
  )
  let last: UIMessage | undefined
  for await (const msg of readUIMessageStream({ stream: aiStream })) {
    last = msg
  }
  return extractFromUIMessage(last)
}

function extractFromUIMessage(msg: UIMessage | undefined): {
  text: string
  toolCalls: ConsumedToolCall[]
} {
  if (!msg?.parts?.length) return { text: '', toolCalls: [] }
  let text = ''
  const toolCalls: ConsumedToolCall[] = []
  for (const part of msg.parts) {
    if (isTextUIPart(part)) {
      text += part.text
    } else if (isToolUIPart(part)) {
      const name = getToolName(part)
      const toolName = `tool-${name}`
      const inv = part as {
        state: string
        input?: unknown
        output?: unknown
        errorText?: string
      }
      toolCalls.push({
        toolName,
        state: inv.state,
        args: inv.input as Record<string, unknown> | undefined,
        result: inv.output ?? inv.errorText,
      })
    }
  }
  return { text, toolCalls }
}
