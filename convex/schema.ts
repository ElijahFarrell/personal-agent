import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { CONTEXT_DOC_CATEGORY, CREDIT_ACTION, CREDIT_TX_TYPE, INDEXES, INTEGRATION_STATUS, MESSAGE_ROLE, MESSAGE_SOURCE, ROLE, SCOPE, TABLES, TIER } from './constants'

export default defineSchema({
  [TABLES.TENANTS]: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    tier: v.union(
      v.literal(TIER.FREE),
      v.literal(TIER.PRO),
      v.literal(TIER.ENTERPRISE)
    ),
    createdAt: v.number(),
  }).index(INDEXES.BY_CLERK_ORG_ID, ['clerkOrgId']),

  [TABLES.USERS]: defineTable({
    clerkUserId: v.string(),
    tenantId: v.id(TABLES.TENANTS),
    telegramId: v.optional(v.string()),
    email: v.string(),
    role: v.union(v.literal(ROLE.OWNER), v.literal(ROLE.MEMBER)),
    createdAt: v.number(),
  })
    .index(INDEXES.BY_CLERK_USER_ID, ['clerkUserId'])
    .index(INDEXES.BY_TENANT_ID, ['tenantId']),

  [TABLES.USER_INTEGRATIONS]: defineTable({
    userId: v.id(TABLES.USERS),
    tenantId: v.id(TABLES.TENANTS),
    provider: v.string(),
    connectionId: v.string(),
    status: v.union(
      v.literal(INTEGRATION_STATUS.ACTIVE),
      v.literal(INTEGRATION_STATUS.NEEDS_RECONNECT)
    ),
    connectedAt: v.number(),
  })
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_CONNECTION_ID, ['connectionId']),

  [TABLES.TENANT_SKILLS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    scope: v.optional(v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER))),
    name: v.string(),
    description: v.string(),
    systemPrompt: v.string(),
    isEnabled: v.boolean(),
    createdAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_TENANT_SCOPE, ['tenantId', 'scope']),

  [TABLES.MESSAGES]: defineTable({
    userId: v.id(TABLES.USERS),
    tenantId: v.id(TABLES.TENANTS),
    role: v.union(
      v.literal(MESSAGE_ROLE.USER),
      v.literal(MESSAGE_ROLE.ASSISTANT)
    ),
    source: v.union(
      v.literal(MESSAGE_SOURCE.WEB),
      v.literal(MESSAGE_SOURCE.TELEGRAM)
    ),
    content: v.string(),
    threadId: v.string(),
    createdAt: v.number(),
    metadata: v.optional(
      v.object({
        route: v.optional(v.string()),
      })
    ),
  })
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_CREATED, ['userId', 'createdAt'])
    .index(INDEXES.BY_THREAD_CREATED, ['threadId', 'createdAt']),

  [TABLES.THREADS]: defineTable({
    userId: v.id(TABLES.USERS),
    tenantId: v.id(TABLES.TENANTS),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_USER_UPDATED, ['userId', 'updatedAt'])
    .index(INDEXES.BY_TENANT_ID, ['tenantId']),

  [TABLES.CONTEXT_DOCS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    scope: v.optional(v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER))),
    title: v.string(),
    content: v.string(),
    category: v.union(
      v.literal(CONTEXT_DOC_CATEGORY.BUSINESS_INFO),
      v.literal(CONTEXT_DOC_CATEGORY.PREFERENCES),
      v.literal(CONTEXT_DOC_CATEGORY.REFERENCE_DOCS),
      v.literal(CONTEXT_DOC_CATEGORY.CUSTOM)
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_TENANT_SCOPE, ['tenantId', 'scope']),

  [TABLES.TENANT_BILLING]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    creditBalance: v.number(),
    trialStartedAt: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index(INDEXES.BY_TENANT_ID, ['tenantId']),

  [TABLES.CREDIT_TRANSACTIONS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    type: v.union(
      v.literal(CREDIT_TX_TYPE.DEBIT),
      v.literal(CREDIT_TX_TYPE.CREDIT)
    ),
    amount: v.number(),
    action: v.union(
      v.literal(CREDIT_ACTION.CHAT_MESSAGE),
      v.literal(CREDIT_ACTION.TOOL_EXECUTION),
      v.literal(CREDIT_ACTION.TRIAL_GRANT),
      v.literal(CREDIT_ACTION.PURCHASE),
      v.literal(CREDIT_ACTION.ADMIN_GRANT),
      v.literal(CREDIT_ACTION.TRIAL_EXPIRED)
    ),
    description: v.string(),
    balanceAfter: v.number(),
    createdAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_CREATED, ['tenantId', 'createdAt']),
})
