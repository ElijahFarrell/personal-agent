import { z } from 'zod'

/**
 * Orchestrator working-memory schema.
 *
 * Working memory is the small, structured state the orchestrator carries
 * across turns within a single user/tenant session. It is distinct from:
 *   - Semantic recall (Qdrant-backed long-term memory)
 *   - mem0 (durable one-liner facts about the user)
 *   - Convex artifacts (large structured outputs produced by tools)
 *
 * This schema is consumed by Mastra Memory when it's enabled on the
 * orchestrator agent. The workflow is:
 *   1. Mastra loads the current working-memory blob for the session.
 *   2. The LLM can update any field via the built-in `update-working-memory`
 *      tool that Mastra Memory provides.
 *   3. On the next turn, we hydrate the system prompt with the serialized
 *      working memory so the orchestrator doesn't have to re-ask the user.
 *
 * Keep fields small and human-readable: working memory is sent in the
 * prompt every turn, so we cap payload size here rather than treat this
 * like a database.
 */

export const USER_PROFILE_MAX_ROLES = 5

/**
 * Stable user-level profile. Changes rarely — we surface whatever the user
 * has explicitly confirmed (name, company, role, goals) so every new
 * conversation starts grounded instead of asking again.
 */
export const UserProfileSchema = z.object({
  displayName: z.string().max(120).optional(),
  company: z.string().max(200).optional(),
  title: z.string().max(200).optional(),
  timezone: z.string().max(80).optional(),
  locale: z.string().max(20).optional(),
  /** Short goal statements the user articulated (e.g. "book 20 demos / mo"). */
  goals: z.array(z.string().max(200)).max(USER_PROFILE_MAX_ROLES).optional(),
  /** Free-form preferences the orchestrator should respect (tone, cadence). */
  preferences: z.record(z.string(), z.string().max(500)).optional(),
})

/**
 * Snapshot of which integrations are wired for this tenant. Mirrors
 * `get-connection-status` output in a shape the LLM can read directly
 * instead of re-calling the tool on every turn.
 */
export const ConnectedToolsSchema = z.object({
  /** Explicitly connected provider ids (`gmail`, `linkedin`, `lemlist`, ...). */
  providers: z.array(z.string().max(80)).max(64).optional(),
  /** Provider ids the user tried to use but that need reconnection. */
  needsReconnect: z.array(z.string().max(80)).max(32).optional(),
  /** Sampled at this timestamp. Cleared automatically after 1 hour. */
  sampledAt: z.number().optional(),
})

/**
 * Ideal Customer Profile the orchestrator is currently targeting.
 * Mirrors what downstream SDR / outreach / ads agents need as input.
 */
export const IcpSchema = z.object({
  summary: z.string().max(1000).optional(),
  industries: z.array(z.string().max(120)).max(20).optional(),
  regions: z.array(z.string().max(120)).max(20).optional(),
  companySize: z.string().max(120).optional(),
  titles: z.array(z.string().max(120)).max(20).optional(),
  painPoints: z.array(z.string().max(240)).max(10).optional(),
  /** Last time the ICP was refined this session. */
  updatedAt: z.number().optional(),
})

/**
 * The campaign the user is actively assembling. Lets the orchestrator
 * answer "where are we?" without re-reading the whole thread.
 */
export const CurrentCampaignSchema = z.object({
  name: z.string().max(200).optional(),
  channel: z.enum(['linkedin', 'email', 'instagram', 'ads', 'mixed']).optional(),
  status: z
    .enum(['scoping', 'drafting', 'awaiting-approval', 'sending', 'completed', 'paused'])
    .optional(),
  /** Ids of the most important artifacts tied to this campaign. */
  artifactIds: z.array(z.string().max(120)).max(10).optional(),
  /** Next concrete action the user or orchestrator owes. */
  nextAction: z.string().max(300).optional(),
  updatedAt: z.number().optional(),
})

/**
 * Active orchestrator/sub-agent runs. The orchestrator uses this to decide
 * whether to resume, cancel, or wait on a prior background job instead of
 * launching a duplicate. Keep it a fixed size — older entries get evicted.
 */
export const ActiveRunSchema = z.object({
  runId: z.string().max(120),
  agentId: z.string().max(80),
  status: z.enum(['pending', 'running', 'suspended']),
  title: z.string().max(240).optional(),
  startedAt: z.number().optional(),
})

export const RECENT_WEBSETS_MAX = 5

/**
 * Compressed pointer to recent Exa websets cached in `websetItems`. Lets the
 * LLM say "I already searched for SMB fintech CEOs last week, want me to
 * reuse those results?" without re-fetching from the cron table every turn.
 */
export const RecentWebsetSchema = z.object({
  websetId: z.string().max(120),
  title: z.string().max(240).optional(),
  count: z.number().int().nonnegative().optional(),
  newestAt: z.number().optional(),
})

/**
 * Current execution plan written by `write-plan`. Mirrored into working
 * memory so the orchestrator keeps it front-of-mind without re-querying.
 */
export const PlanStepSchema = z.object({
  label: z.string().max(200),
  agentId: z.string().max(80).optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
})

export const PlanSchema = z.object({
  title: z.string().max(200).optional(),
  steps: z.array(PlanStepSchema).max(20).optional(),
  notes: z.string().max(1000).optional(),
  updatedAt: z.number().optional(),
})

/**
 * Top-level working memory blob for the orchestrator. Every field is
 * optional so the LLM can fill them in progressively. Mastra Memory treats
 * this as the single source of truth for durable-within-session state.
 */
export const OrchestratorWorkingMemorySchema = z.object({
  userProfile: UserProfileSchema.optional(),
  connectedTools: ConnectedToolsSchema.optional(),
  activeRunIds: z.array(ActiveRunSchema).max(10).optional(),
  icp: IcpSchema.optional(),
  currentCampaign: CurrentCampaignSchema.optional(),
  recentWebsets: z.array(RecentWebsetSchema).max(RECENT_WEBSETS_MAX).optional(),
  plan: PlanSchema.optional(),
})

export type OrchestratorWorkingMemory = z.infer<
  typeof OrchestratorWorkingMemorySchema
>

export type UserProfile = z.infer<typeof UserProfileSchema>
export type ConnectedToolsMemory = z.infer<typeof ConnectedToolsSchema>
export type Icp = z.infer<typeof IcpSchema>
export type CurrentCampaign = z.infer<typeof CurrentCampaignSchema>
export type ActiveRunMemory = z.infer<typeof ActiveRunSchema>
export type RecentWebsetMemory = z.infer<typeof RecentWebsetSchema>
export type PlanMemory = z.infer<typeof PlanSchema>

/**
 * Empty default — used when Memory isn't available yet or the user is
 * starting a fresh session.
 */
export const EMPTY_WORKING_MEMORY: OrchestratorWorkingMemory = Object.freeze({
  userProfile: undefined,
  connectedTools: undefined,
  activeRunIds: undefined,
  icp: undefined,
  currentCampaign: undefined,
  recentWebsets: undefined,
  plan: undefined,
})
