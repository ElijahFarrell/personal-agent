// ─── Table Names ─────────────────────────────────────────────────────────────

export const TABLES = {
  TENANTS: 'tenants',
  USERS: 'users',
  USER_INTEGRATIONS: 'userIntegrations',
  TENANT_SKILLS: 'tenantSkills',
  MESSAGES: 'messages',
  THREADS: 'threads',
  CONTEXT_DOCS: 'contextDocs',
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
} as const

// ─── Enum Values ─────────────────────────────────────────────────────────────

export const TIER = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
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
