import { gateway } from 'ai'

/**
 * Model tier shortcuts — swap a tier here to update all agents using it.
 * All models are routed through the Vercel AI Gateway.
 *
 * Available providers: https://sdk.vercel.ai/providers/ai-sdk-providers
 */
export const Models = {
  // ─── Anthropic ──────────────────────────────────────────────────────────────
  CLAUDE_HAIKU:      () => gateway('anthropic/claude-haiku-4.5'),
  CLAUDE_SONNET:     () => gateway('anthropic/claude-sonnet-4.5'),
  CLAUDE_OPUS:       () => gateway('anthropic/claude-opus-4.5'),
  CLAUDE_SONNET_4_6: () => gateway('anthropic/claude-sonnet-4.6'),
  CLAUDE_OPUS_4_6:   () => gateway('anthropic/claude-opus-4.6'),

  // ─── OpenAI ─────────────────────────────────────────────────────────────────
  GPT_4O_MINI: () => gateway('openai/gpt-4o-mini'),
  GPT_4O:      () => gateway('openai/gpt-4o'),
  O3_MINI:     () => gateway('openai/o3-mini'),
  GPT_5_3:     () => gateway('openai/gpt-5.3-codex'),
  GPT_5_4:     () => gateway('openai/gpt-5.4'),

  // ─── Google ─────────────────────────────────────────────────────────────────
  GEMINI_FLASH:       () => gateway('google/gemini-2.0-flash'),
  GEMINI_PRO:         () => gateway('google/gemini-2.5-pro'),
  GEMINI_3_FLASH:     () => gateway('google/gemini-3-flash'),
  GEMINI_3_1_PRO:     () => gateway('google/gemini-3.1-pro-preview'),

  // ─── xAI ────────────────────────────────────────────────────────────────────
  GROK_4_1_FAST:           () => gateway('xai/grok-4.1-fast-non-reasoning'),
  GROK_4_1_FAST_REASONING: () => gateway('xai/grok-4.1-fast-reasoning'),
} as const

/**
 * Role-based model assignments.
 * Change one entry here to swap the model for all agents in that role.
 */
export const AgentModels = {
  /** Central orchestrator — needs strong reasoning and tool use */
  orchestrator: Models.GEMINI_3_1_PRO,

  /** Sub-agents that need strong writing / reasoning */
  content:      Models.CLAUDE_SONNET,
  email:        Models.CLAUDE_SONNET,
  linkedin:     Models.CLAUDE_SONNET,
  browser:      Models.CLAUDE_SONNET,

  /** Deep research — needs strong reasoning for multi-source synthesis */
  deepResearch: Models.CLAUDE_SONNET,

  /** Sub-agents where speed matters more than nuance */
  calendar:     Models.CLAUDE_HAIKU,
  instagram:    Models.CLAUDE_HAIKU,
  slack:        Models.CLAUDE_HAIKU,
  notion:       Models.CLAUDE_HAIKU,
  research:     Models.CLAUDE_HAIKU,
  crm:          Models.CLAUDE_HAIKU,
  project:      Models.CLAUDE_HAIKU,
  messaging:    Models.CLAUDE_HAIKU,
  docs:         Models.CLAUDE_HAIKU,
  realEstate:   Models.CLAUDE_HAIKU,
  finance:      Models.CLAUDE_HAIKU,
  marketing:    Models.CLAUDE_HAIKU,
  metaAds:      Models.CLAUDE_HAIKU,

  /** Competitive ads intelligence — SEARCH_API tool use + analysis */
  adsIntelligence: Models.CLAUDE_SONNET,
} as const

/** Context window sizes (tokens) per model for usage display */
export const CONTEXT_WINDOW_SIZES: Record<string, number> = {
  'anthropic/claude-haiku-4.5': 200_000,
  'anthropic/claude-sonnet-4.5': 200_000,
  'anthropic/claude-opus-4.5': 200_000,
  'anthropic/claude-sonnet-4.6': 1_000_000,
  'anthropic/claude-opus-4.6': 1_000_000,
  'google/gemini-3-flash': 1_000_000,
  'google/gemini-3.1-pro-preview': 1_000_000,
  'google/gemini-2.0-flash': 1_000_000,
  'google/gemini-2.5-pro': 1_000_000,
  'openai/gpt-4o-mini': 128_000,
  'openai/gpt-5.3-codex': 400_000,
  'openai/gpt-5.4': 1_100_000,
  'xai/grok-4.1-fast-non-reasoning': 2_000_000,
  'xai/grok-4.1-fast-reasoning': 2_000_000,
}
export const DEFAULT_CONTEXT_WINDOW = 1_000_000

/** Default model when user selects "Auto" in the chat model selector */
export const DEFAULT_CHAT_MODEL_ID = 'google/gemini-3.1-pro-preview'

/** Models available in the chat model selector, grouped by company */
export const SELECTABLE_MODELS = [
  { id: 'auto', label: 'Auto', company: 'auto' },
  { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', company: 'anthropic' },
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6', company: 'anthropic' },
  { id: 'anthropic/claude-opus-4.6', label: 'Claude Opus 4.6', company: 'anthropic' },
  { id: 'google/gemini-3-flash', label: 'Gemini 3 Flash', company: 'google' },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', company: 'google' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', company: 'openai' },
  { id: 'openai/gpt-5.3-codex', label: 'GPT-5.3 Codex', company: 'openai' },
  { id: 'openai/gpt-5.4', label: 'GPT-5.4', company: 'openai' },
  { id: 'xai/grok-4.1-fast-non-reasoning', label: 'Grok 4.1 Fast', company: 'xai' },
  { id: 'xai/grok-4.1-fast-reasoning', label: 'Grok 4.1 Fast Reasoning', company: 'xai' },
] as const
