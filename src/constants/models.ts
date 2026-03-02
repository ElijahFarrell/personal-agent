import { gateway } from 'ai'

/**
 * Model tier shortcuts — swap a tier here to update all agents using it.
 * All models are routed through the Vercel AI Gateway.
 *
 * Available providers: https://sdk.vercel.ai/providers/ai-sdk-providers
 */
export const Models = {
  // ─── Anthropic ──────────────────────────────────────────────────────────────
  CLAUDE_HAIKU:   () => gateway('anthropic/claude-haiku-4-5'),
  CLAUDE_SONNET:  () => gateway('anthropic/claude-sonnet-4-5'),
  CLAUDE_OPUS:    () => gateway('anthropic/claude-opus-4-5'),

  // ─── OpenAI ─────────────────────────────────────────────────────────────────
  GPT_4O_MINI:    () => gateway('openai/gpt-4o-mini'),
  GPT_4O:         () => gateway('openai/gpt-4o'),
  O3_MINI:        () => gateway('openai/o3-mini'),

  // ─── Google ─────────────────────────────────────────────────────────────────
  GEMINI_FLASH:   () => gateway('google/gemini-2.0-flash'),
  GEMINI_PRO:     () => gateway('google/gemini-2.5-pro'),
} as const

/**
 * Role-based model assignments.
 * Change one entry here to swap the model for all agents in that role.
 */
export const AgentModels = {
  /** Central orchestrator — needs strong reasoning and tool use */
  orchestrator: Models.CLAUDE_SONNET,

  /** Sub-agents that produce content or take complex actions */
  content:      Models.CLAUDE_SONNET,
  email:        Models.CLAUDE_SONNET,
  calendar:     Models.CLAUDE_SONNET,
  linkedin:     Models.CLAUDE_SONNET,
  instagram:    Models.CLAUDE_SONNET,
  browser:      Models.CLAUDE_SONNET,

  /** Research agent — speed-optimised, haiku is sufficient for web synthesis */
  research:     Models.CLAUDE_HAIKU,
} as const
