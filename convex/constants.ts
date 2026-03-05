// ─── Table Names ─────────────────────────────────────────────────────────────

export const TABLES = {
  TENANTS: 'tenants',
  USERS: 'users',
  USER_INTEGRATIONS: 'userIntegrations',
  TENANT_SKILLS: 'tenantSkills',
  MESSAGES: 'messages',
  THREADS: 'threads',
  CONTEXT_DOCS: 'contextDocs',
  TENANT_BILLING: 'tenantBilling',
  CREDIT_TRANSACTIONS: 'creditTransactions',
  TELEGRAM_LINK_TOKENS: 'telegramLinkTokens',
} as const

// ─── Index Names ─────────────────────────────────────────────────────────────

export const INDEXES = {
  BY_CLERK_ORG_ID: 'by_clerkOrgId',
  BY_CLERK_USER_ID: 'by_clerkUserId',
  BY_TENANT_ID: 'by_tenantId',
  BY_USER_ID: 'by_userId',
  BY_CONNECTION_ID: 'by_connectionId',
  BY_USER_CREATED: 'by_userId_createdAt',
  BY_USER_UPDATED: 'by_userId_updatedAt',
  BY_THREAD_CREATED: 'by_threadId_createdAt',
  BY_TENANT_SCOPE: 'by_tenantId_scope',
  BY_TENANT_CREATED: 'by_tenantId_createdAt',
  BY_TOKEN: 'by_token',
  BY_TELEGRAM_ID: 'by_telegramId',
} as const

// ─── Enum Values ─────────────────────────────────────────────────────────────

export const TIER = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const

// ─── Credit System ───────────────────────────────────────────────────────────

export const CREDIT_TX_TYPE = {
  DEBIT: 'debit',
  CREDIT: 'credit',
} as const

export const CREDIT_ACTION = {
  CHAT_MESSAGE: 'chat_message',
  TOOL_EXECUTION: 'tool_execution',
  TRIAL_GRANT: 'trial_grant',
  PURCHASE: 'purchase',
  ADMIN_GRANT: 'admin_grant',
  TRIAL_EXPIRED: 'trial_expired',
} as const

export const CREDIT_COSTS = {
  [CREDIT_ACTION.CHAT_MESSAGE]: 1,
  [CREDIT_ACTION.TOOL_EXECUTION]: 2,
} as const

// ─── Trial Configuration ─────────────────────────────────────────────────────

export const TRIAL = {
  DURATION_MS: 7 * 24 * 60 * 60 * 1000,
  INITIAL_CREDITS: 100,
} as const

// ─── Tier Credit Limits (monthly allowance for non-trial tiers) ──────────────

export const TIER_CREDITS = {
  [TIER.FREE]: 10,
  [TIER.PRO]: 1000,
  [TIER.ENTERPRISE]: 10000,
} as const

export const ROLE = {
  OWNER: 'owner',
  MEMBER: 'member',
} as const

export const INTEGRATION_STATUS = {
  ACTIVE: 'active',
  NEEDS_RECONNECT: 'needs_reconnect',
} as const

export const MESSAGE_ROLE = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const

export const MESSAGE_SOURCE = {
  WEB: 'web',
  TELEGRAM: 'telegram',
} as const

export const CONTEXT_DOC_CATEGORY = {
  BUSINESS_INFO: 'business-info',
  PREFERENCES: 'preferences',
  REFERENCE_DOCS: 'reference-docs',
  CUSTOM: 'custom',
} as const

export const SCOPE = {
  ORG: 'org',
  USER: 'user',
} as const
