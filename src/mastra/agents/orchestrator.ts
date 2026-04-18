import { gateway } from 'ai'
import { Agent } from '@mastra/core/agent'
import type { Workspace } from '@mastra/core/workspace'
import type {
  DelegationConfig,
  OnDelegationStartHandler,
  OnDelegationCompleteHandler,
  MessageFilterContext,
} from '@mastra/core/agent'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AgentModels } from '@/constants/models'
import { createMem0MemorizeTool } from '../tools/mem0Memorize'
import { createMem0RecallTool } from '../tools/mem0Recall'
import { webSearchTool } from '../tools/webSearchTool'
import { deepSearchTool } from '../tools/deepSearchTool'
import { createAgentTools, type AgentContextRetrieval } from '../tools/agentTools'

export type { AgentContextRetrieval }
import { createOrchestratorMemory } from '../memory'
import { buildOrchestratorPrompt } from '../prompts'
import { createVoice } from '../voice'
import { createWorkspaceForTenant } from '../createWorkspaceForTenant'
import { adsIntelligenceWorkflow } from '../workflows/adsIntelligencePipeline'
import type { ResolvedPlatformConfig } from '@/platform/niche/types'
import type { AgentId } from '@/constants/agents'
import { AGENT_RUN_STATUS } from '@convex/constants'
import { createEmailAgent } from './emailAgent'
import { createResearchAgent } from './researchAgent'
import { createDeepResearchAgent } from './deepResearchAgent'
import { createCalendarAgent } from './calendarAgent'
import { createLinkedInAgent } from './linkedinAgent'
import { createContentAgent } from './contentAgent'
import { createInstagramAgent } from './instagramAgent'
import { createBrowserAgent } from './browserAgent'
import { createMessagingAgent } from './messagingAgent'
import { createDocsAgent } from './docsAgent'
import { createCrmAgent } from './crmAgent'
import { createProjectAgent } from './projectAgent'
import { createRealEstateAgent } from './realEstateAgent'
import { createFinanceAgent } from './financeAgent'
import { createMarketingAgent } from './marketingAgent'
import { createMetaAdsAgent } from './metaAdsAgent'
import { createAdsScraperAgent } from './adsScraperAgent'
import { createAdAnalyzerAgent } from './adAnalyzerAgent'
import { createCampaignBuilderAgent } from './campaignBuilderAgent'
import { createSDRAgent } from './sdrAgent'
import { createLeadAgent } from './leadAgent'

function shouldIncludeAdsWorkflow(
  resolved: ResolvedPlatformConfig | undefined
): boolean {
  if (!resolved) return true
  if (resolved.fullPlatformAccess) return true
  const ads: AgentId[] = ['adsScraper', 'adAnalyzer', 'campaignBuilder']
  return ads.some((id) => resolved.effectiveAllowedAgents.has(id))
}

export interface OrchestratorSkillScope {
  tenantId: string
  userId: string
}

/* ─────────────────────── Convex wiring (best-effort) ─────────────────────── */

interface ConvexWiring {
  client: ConvexHttpClient
  tenantId: Id<'tenants'>
  userId: Id<'users'>
  orchestratorRunId: Id<'agentRuns'>
}

async function setupConvexWiring(
  clerkUserId: string,
  tenantIdString: string,
  threadId: string | undefined,
  tracingTags: string[]
): Promise<ConvexWiring | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return null
  try {
    const client = new ConvexHttpClient(url)
    const user = await client.query(api.users.getUserByClerkUserId, {
      clerkUserId,
    })
    if (!user) return null

    const orchestratorRunId = await client.mutation(api.agentRuns.create, {
      tenantId: tenantIdString as Id<'tenants'>,
      userId: user._id,
      agentId: 'orchestrator',
      threadId,
      title: 'Orchestrator session',
      tracingTags,
    })

    return {
      client,
      tenantId: tenantIdString as Id<'tenants'>,
      userId: user._id,
      orchestratorRunId,
    }
  } catch (err) {
    console.warn('[orchestrator] Convex wiring setup failed', err)
    return null
  }
}

/* ─────────────────────── sub-agent builders (lazy) ─────────────────────── */

/**
 * Returns true when the supervisor should expose a sub-agent with id {@link id}
 * to the LLM under the active platform/niche configuration. Mirrors the filter
 * used in `buildOrchestratorPrompt` so every delegation key documented in the
 * prompt also exists in `agents:{}` at runtime.
 */
function isAgentAllowed(
  id: AgentId,
  resolved: ResolvedPlatformConfig | undefined
): boolean {
  if (!resolved) return true
  if (resolved.fullPlatformAccess) return true
  return resolved.effectiveAllowedAgents.has(id)
}

async function buildSubAgents(args: {
  userId: string
  tenantId: string
  connectedProviders: string[]
  workspace?: Workspace
  platformResolved?: ResolvedPlatformConfig
}): Promise<Record<string, Agent>> {
  const { userId, tenantId, connectedProviders, workspace, platformResolved } =
    args
  const draftScope = { tenantId, userId }
  const allow = (id: AgentId) => isAgentAllowed(id, platformResolved)

  type Entry<K extends AgentId> = readonly [K, () => Agent | Promise<Agent>]

  /**
   * Registry of all sub-agents the supervisor may expose. Each entry is
   * `[agentId, factory]` — factories are thunks so we only allocate the agents
   * whose id passes the platform filter.
   */
  const registry: ReadonlyArray<Entry<AgentId>> = [
    ['email', async () => (await createEmailAgent(userId, connectedProviders, workspace, tenantId)).agent],
    ['calendar', async () => (await createCalendarAgent(userId, connectedProviders, workspace)).agent],
    ['messaging', async () => (await createMessagingAgent(userId, connectedProviders, workspace, tenantId)).agent],
    ['docs', async () => (await createDocsAgent(userId, connectedProviders, workspace)).agent],
    ['crm', async () => (await createCrmAgent(userId, connectedProviders, workspace, tenantId)).agent],
    ['project', async () => (await createProjectAgent(userId, connectedProviders, workspace)).agent],
    ['realEstate', async () => (await createRealEstateAgent(userId, connectedProviders, workspace)).agent],
    ['finance', async () => (await createFinanceAgent(userId, connectedProviders, workspace)).agent],
    ['marketing', async () => (await createMarketingAgent(userId, connectedProviders, workspace, tenantId)).agent],
    ['metaAds', async () => (await createMetaAdsAgent(userId, connectedProviders, workspace)).agent],
    ['adsScraper', async () => (await createAdsScraperAgent(userId, connectedProviders, workspace)).agent],
    ['adAnalyzer', async () => (await createAdAnalyzerAgent(userId, connectedProviders, workspace)).agent],
    ['campaignBuilder', async () => (await createCampaignBuilderAgent(userId, connectedProviders, workspace)).agent],
    ['content', async () => createContentAgent(userId, draftScope, workspace)],
    ['research', () => createResearchAgent(userId, workspace)],
    ['linkedin', () => createLinkedInAgent(userId, workspace)],
    ['instagram', () => createInstagramAgent(userId, workspace)],
    ['browser', () => createBrowserAgent(userId, workspace)],
    ['sdr', () => createSDRAgent(userId, tenantId)],
  ]

  const selected = registry.filter(([id]) => allow(id))
  const instances = await Promise.all(selected.map(([, factory]) => factory()))

  const agents: Record<string, Agent> = {}
  for (let i = 0; i < selected.length; i++) {
    const [id] = selected[i]
    agents[`agent-${id}`] = instances[i]
  }

  // Deep-research and lead are auxiliary agents not listed in AGENT_REGISTRY;
  // keep them tied to the research/sdr permissions so they appear alongside
  // their primary counterparts when allowed.
  if (allow('research')) {
    agents['agent-deepResearch'] = createDeepResearchAgent(userId)
  }
  if (allow('sdr')) {
    agents['agent-lead'] = await createLeadAgent(userId, tenantId, workspace)
  }

  return agents
}

/* ─────────────────────── delegation hooks ─────────────────────── */

interface DelegationState {
  agentRunId: Id<'agentRuns'>
  delegationId: Id<'delegations'>
  startedAt: number
}

function buildDelegationConfig(
  wiring: ConvexWiring | null
): DelegationConfig | undefined {
  if (!wiring) return undefined
  const { client, tenantId, userId, orchestratorRunId } = wiring
  const state = new Map<string, DelegationState>()

  const onDelegationStart: OnDelegationStartHandler = async (ctx) => {
    try {
      const childRunId = await client.mutation(api.agentRuns.create, {
        tenantId,
        userId,
        agentId: ctx.primitiveId,
        threadId: ctx.threadId,
        parentRunId: orchestratorRunId,
        title: `${ctx.primitiveId}: ${ctx.prompt.slice(0, 80)}`,
        input: { prompt: ctx.prompt, params: ctx.params },
        tracingTags: [
          `delegation`,
          `parent:${ctx.parentAgentName}`,
          `child:${ctx.primitiveId}`,
          `iteration:${ctx.iteration}`,
        ],
      })
      await client.mutation(api.agentRuns.updateStatus, {
        runId: childRunId,
        status: AGENT_RUN_STATUS.RUNNING,
      })
      const delegationId = await client.mutation(api.delegations.create, {
        tenantId,
        parentRunId: orchestratorRunId,
        childRunId,
        targetAgentId: ctx.primitiveId,
        input: { prompt: ctx.prompt, iteration: ctx.iteration },
      })
      await client.mutation(api.delegations.updateStatus, {
        delegationId,
        status: AGENT_RUN_STATUS.RUNNING,
      })
      state.set(ctx.toolCallId, {
        agentRunId: childRunId,
        delegationId,
        startedAt: Date.now(),
      })
    } catch (err) {
      console.warn('[orchestrator] onDelegationStart persistence failed', err)
    }
  }

  const onDelegationComplete: OnDelegationCompleteHandler = async (ctx) => {
    const entry = state.get(ctx.toolCallId)
    if (!entry) return
    state.delete(ctx.toolCallId)
    const status = ctx.success
      ? AGENT_RUN_STATUS.COMPLETED
      : AGENT_RUN_STATUS.FAILED
    try {
      await client.mutation(api.delegations.updateStatus, {
        delegationId: entry.delegationId,
        status,
        output: {
          text: ctx.result.text,
          durationMs: ctx.duration,
          subAgentThreadId: ctx.result.subAgentThreadId,
        },
      })
      await client.mutation(api.agentRuns.updateStatus, {
        runId: entry.agentRunId,
        status,
        output: { text: ctx.result.text },
        error: ctx.error?.message,
      })
    } catch (err) {
      console.warn('[orchestrator] onDelegationComplete persistence failed', err)
    }
  }

  /**
   * Context isolation: strip noisy tool-invocation parts and keep only the
   * last ~8 textual turns for the sub-agent. Prevents multi-page parent
   * histories from poisoning the sub-agent context.
   */
  const messageFilter = (context: MessageFilterContext) => {
    const { messages } = context
    const textual = messages.filter((m) => {
      const parts = (m as { content?: { parts?: Array<{ type?: string }> } })
        .content?.parts
      if (!parts) return true
      return !parts.every((p) => p?.type === 'tool-invocation')
    })
    return textual.slice(-8)
  }

  return { onDelegationStart, onDelegationComplete, messageFilter }
}

/* ─────────────────────── factory ─────────────────────── */

/**
 * Factory creates an orchestrator agent scoped to a specific user with the
 * native Mastra supervisor pattern:
 *
 *  - Sub-agents are registered via `agents:{}` so the LLM can delegate with a
 *    standard tool-call envelope.
 *  - Every delegation produces a pair of Convex rows (`agentRuns` + `delegations`)
 *    so the /dashboard/runs viewer and downstream observability tooling get a
 *    durable audit trail of parent→child hops.
 *  - `messageFilter` strips tool-invocation clutter so each sub-agent receives
 *    a compact textual history rather than the full orchestrator transcript.
 */
export async function createOrchestratorAgent(
  userId: string,
  tenantId: string,
  agentInstructions?: Record<string, string>,
  connectedProviders: string[] = [],
  modelId?: string,
  skillScope?: OrchestratorSkillScope,
  platformResolved?: ResolvedPlatformConfig,
  contextRetrieval?: AgentContextRetrieval,
  threadId?: string
) {
  const workspace = skillScope
    ? await createWorkspaceForTenant(
        skillScope.tenantId,
        skillScope.userId,
        platformResolved
      )
    : undefined

  const agentTools = createAgentTools(
    userId,
    tenantId,
    agentInstructions,
    connectedProviders,
    workspace,
    platformResolved,
    contextRetrieval
  )

  const baseInstructions = buildOrchestratorPrompt(
    userId,
    tenantId,
    connectedProviders,
    platformResolved
  )
  const orchestratorCustom = agentInstructions?.orchestrator?.trim()
  const instructions = orchestratorCustom
    ? `${baseInstructions}\n\n## Additional Instructions\n${orchestratorCustom}`
    : baseInstructions

  const model = modelId ? gateway(modelId) : AgentModels.orchestrator()

  const wiring = await setupConvexWiring(userId, tenantId, threadId, [
    'agent:orchestrator',
    `tenant:${tenantId}`,
  ])
  const delegation = buildDelegationConfig(wiring)

  return new Agent({
    id: `orchestrator-${userId}`,
    name: 'orchestrator',
    description: 'Supervisor orchestrator for the personal-agent platform.',
    instructions,
    model,
    voice: createVoice(),
    memory: createOrchestratorMemory(),
    workspace: workspace as Workspace | undefined,
    tools: {
      ...agentTools,
      webSearch: webSearchTool,
      deepSearch: deepSearchTool,
      mem0Recall: createMem0RecallTool(userId),
      mem0Memorize: createMem0MemorizeTool(userId),
    },
    agents: async () =>
      buildSubAgents({
        userId,
        tenantId,
        connectedProviders,
        workspace,
        platformResolved,
      }),
    workflows: shouldIncludeAdsWorkflow(platformResolved)
      ? { adsIntelligence: adsIntelligenceWorkflow }
      : {},
    ...(delegation ? { defaultOptions: { delegation } } : {}),
  })
}
