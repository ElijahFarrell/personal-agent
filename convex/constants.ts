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
  PROSPECTS: 'prospects',
  PROSPECT_FIELD_DEFINITIONS: 'prospectFieldDefinitions',
  PROSPECT_RESEARCH_SNAPSHOTS: 'prospectResearchSnapshots',
  OUTREACH_DRAFTS: 'outreachDrafts',
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
  BY_PROSPECT_ID: 'by_prospectId',
  BY_TENANT_STATUS: 'by_tenantId_status',
  BY_TENANT_STAGE: 'by_tenantId_stage',
  BY_OWNER_ID: 'by_ownerId',
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

// ─── Prospect System ─────────────────────────────────────────────────────────

export const PROSPECT_STATUS = {
  NEW: 'new',
  RESEARCHING: 'researching',
  DRAFT_READY: 'draft_ready',
  APPROVED: 'approved',
  SENT: 'sent',
  REPLIED: 'replied',
  ARCHIVED: 'archived',
} as const

export const PROSPECT_STAGE = {
  NEW: 'new',
  MESSAGED: 'messaged',
  FOLLOW_UP: 'follow_up',
  MEETING_BOOKED: 'meeting_booked',
  INTERESTED: 'interested',
  DEAD: 'dead',
  DEAL_OPEN: 'deal_open',
} as const

export const PROSPECT_SOURCE = {
  MANUAL: 'manual',
  LINKEDIN_SEARCH: 'linkedin_search',
  CRM_IMPORT: 'crm_import',
  CSV_IMPORT: 'csv_import',
} as const

export const OUTREACH_CHANNEL = {
  LINKEDIN: 'linkedin',
  EMAIL: 'email',
  INSTAGRAM: 'instagram',
} as const

export const DRAFT_STATUS = {
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SENT: 'sent',
  FAILED: 'failed',
} as const

export const CUSTOM_FIELD_TYPE = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  DATE: 'date',
  URL: 'url',
  BOOLEAN: 'boolean',
} as const
