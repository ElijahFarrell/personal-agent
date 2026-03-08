import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { CONTEXT_DOC_CATEGORY, CREDIT_ACTION, CREDIT_TX_TYPE, CUSTOM_FIELD_TYPE, DRAFT_STATUS, INDEXES, INTEGRATION_STATUS, MESSAGE_ROLE, MESSAGE_SOURCE, OUTREACH_CHANNEL, PROSPECT_SOURCE, PROSPECT_STAGE, PROSPECT_STATUS, ROLE, SCOPE, SKILL_SOURCE, TABLES, TIER } from './constants'

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
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TELEGRAM_ID, ['telegramId']),

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
    skillName: v.optional(v.string()),
    isEnabled: v.boolean(),
    isPinned: v.optional(v.boolean()),
    createdAt: v.number(),
    // Legacy fields kept for backward compat during migration
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_TENANT_SCOPE, ['tenantId', 'scope']),

  [TABLES.SKILL_CONTENT]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    scope: v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER)),
    skillName: v.string(),
    description: v.string(),
    /** Full SKILL.md content (markdown with frontmatter) */
    content: v.string(),
    source: v.union(
      v.literal(SKILL_SOURCE.AUTHORED),
      v.literal(SKILL_SOURCE.INSTALLED)
    ),
    /** For installed skills: GitHub repo (e.g. "anthropics/skills/frontend-design") */
    sourceUrl: v.optional(v.string()),
    /** Reference files bundled with the skill, keyed by relative path */
    references: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_TENANT_SCOPE, ['tenantId', 'scope'])
    .index(INDEXES.BY_TENANT_SKILL_NAME, ['tenantId', 'skillName']),

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
        toolCalls: v.optional(
          v.array(
            v.object({
              toolName: v.string(),
              state: v.string(),
              args: v.optional(v.any()),
              result: v.optional(v.any()),
            })
          )
        ),
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
    unlimitedCredits: v.optional(v.boolean()),
    trialStartedAt: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index(INDEXES.BY_TENANT_ID, ['tenantId']),

  [TABLES.TELEGRAM_LINK_TOKENS]: defineTable({
    token: v.string(),
    clerkUserId: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index(INDEXES.BY_TOKEN, ['token'])
    .index(INDEXES.BY_CLERK_USER_ID, ['clerkUserId']),

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

  // ─── Prospects ──────────────────────────────────────────────────────────────

  [TABLES.PROSPECTS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    ownerId: v.optional(v.id(TABLES.USERS)),
    name: v.string(),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    status: v.union(
      v.literal(PROSPECT_STATUS.NEW),
      v.literal(PROSPECT_STATUS.RESEARCHING),
      v.literal(PROSPECT_STATUS.DRAFT_READY),
      v.literal(PROSPECT_STATUS.APPROVED),
      v.literal(PROSPECT_STATUS.SENT),
      v.literal(PROSPECT_STATUS.REPLIED),
      v.literal(PROSPECT_STATUS.ARCHIVED)
    ),
    stage: v.optional(v.union(
      v.literal(PROSPECT_STAGE.NEW),
      v.literal(PROSPECT_STAGE.MESSAGED),
      v.literal(PROSPECT_STAGE.FOLLOW_UP),
      v.literal(PROSPECT_STAGE.MEETING_BOOKED),
      v.literal(PROSPECT_STAGE.INTERESTED),
      v.literal(PROSPECT_STAGE.DEAD),
      v.literal(PROSPECT_STAGE.DEAL_OPEN)
    )),
    source: v.union(
      v.literal(PROSPECT_SOURCE.MANUAL),
      v.literal(PROSPECT_SOURCE.LINKEDIN_SEARCH),
      v.literal(PROSPECT_SOURCE.CRM_IMPORT),
      v.literal(PROSPECT_SOURCE.CSV_IMPORT)
    ),
    notes: v.optional(v.string()),
    customFields: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_STATUS, ['tenantId', 'status'])
    .index(INDEXES.BY_TENANT_STAGE, ['tenantId', 'stage'])
    .index(INDEXES.BY_OWNER_ID, ['ownerId']),

  [TABLES.PROSPECT_FIELD_DEFINITIONS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    name: v.string(),
    label: v.string(),
    fieldType: v.union(
      v.literal(CUSTOM_FIELD_TYPE.TEXT),
      v.literal(CUSTOM_FIELD_TYPE.NUMBER),
      v.literal(CUSTOM_FIELD_TYPE.SELECT),
      v.literal(CUSTOM_FIELD_TYPE.DATE),
      v.literal(CUSTOM_FIELD_TYPE.URL),
      v.literal(CUSTOM_FIELD_TYPE.BOOLEAN)
    ),
    options: v.optional(v.array(v.string())),
    isRequired: v.optional(v.boolean()),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId']),

  [TABLES.PROSPECT_RESEARCH_SNAPSHOTS]: defineTable({
    prospectId: v.id(TABLES.PROSPECTS),
    tenantId: v.id(TABLES.TENANTS),
    linkedinProfile: v.optional(v.object({
      headline: v.optional(v.string()),
      recentActivity: v.optional(v.string()),
      connectionDegree: v.optional(v.string()),
    })),
    companyInfo: v.optional(v.object({
      summary: v.optional(v.string()),
      sourceUrl: v.optional(v.string()),
    })),
    newsArticles: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      snippet: v.string(),
    }))),
    personalizationAngles: v.optional(v.array(v.string())),
    researchedAt: v.number(),
  })
    .index(INDEXES.BY_PROSPECT_ID, ['prospectId'])
    .index(INDEXES.BY_TENANT_ID, ['tenantId']),

  [TABLES.OUTREACH_DRAFTS]: defineTable({
    prospectId: v.id(TABLES.PROSPECTS),
    tenantId: v.id(TABLES.TENANTS),
    channel: v.union(
      v.literal(OUTREACH_CHANNEL.LINKEDIN),
      v.literal(OUTREACH_CHANNEL.EMAIL),
      v.literal(OUTREACH_CHANNEL.INSTAGRAM)
    ),
    subject: v.optional(v.string()),
    body: v.string(),
    status: v.union(
      v.literal(DRAFT_STATUS.PENDING_REVIEW),
      v.literal(DRAFT_STATUS.APPROVED),
      v.literal(DRAFT_STATUS.REJECTED),
      v.literal(DRAFT_STATUS.SENT),
      v.literal(DRAFT_STATUS.FAILED)
    ),
    sentAt: v.optional(v.number()),
    sendError: v.optional(v.string()),
    crmSynced: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_PROSPECT_ID, ['prospectId'])
    .index(INDEXES.BY_TENANT_ID, ['tenantId']),
})
