/**
 * Chat-related constants: roles, sources, limits, timeouts.
 */
export const CHAT_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const

export type ChatRole = (typeof CHAT_ROLES)[keyof typeof CHAT_ROLES]

/** Message shape for agent prompts (system, user, assistant). */
export interface AgentMessage {
  role: ChatRole
  content: string
}

export const CHAT_SOURCES = {
  WEB: 'web',
  TELEGRAM: 'telegram',
} as const

export type ChatSource = (typeof CHAT_SOURCES)[keyof typeof CHAT_SOURCES]

export const CHAT_LIMITS = {
  /** Max characters in chat input */
  MAX_INPUT_LENGTH: 4000,
  /** Max visible rows in chat input textarea */
  MAX_INPUT_ROWS: 8,
  /** Max messages to include in API history */
  HISTORY_LIMIT: 20,
  /** Ms to auto-dismiss chat error toast */
  ERROR_DISMISS_MS: 10000,
} as const

/** Credit action for chat messages (used when deducting credits) */
export const CHAT_CREDIT_ACTION = 'chat_message' as const
