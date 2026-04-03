import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import {
  ADS_PIPELINE_RUN_STATUS,
  BILLING_MODEL,
  CHAT_JOB_STATUS,
  CONTEXT_DOC_CATEGORY,
  CONTENT_DRAFT_STATUS,
  CONTENT_PLATFORM,
  CREDIT_ACTION,
  CREDIT_TX_TYPE,
  CUSTOM_FIELD_TYPE,
  DRAFT_STATUS,
  INDEXES,
  INBOX_PROVIDER,
  INTEGRATION_STATUS,
  MEDIA_ASSET_STATUS,
  MESSAGE_ROLE,
  MESSAGE_SOURCE,
  OUTREACH_CHANNEL,
  PROSPECT_SOURCE,
  PROSPECT_STAGE,
  PROSPECT_STATUS,
  ROLE,
  SCHEDULE_ACTION_TYPE,
  SCHEDULE_LOG_STATUS,
  SCOPE,
  SKILL_SOURCE,
  SUBSCRIPTION_STATUS,
  MARKETING_METRIC_SOURCE,
  TABLES,
  TIER,
  VIDEO_JOB_STATUS,
  WORKFLOW_RUN_STATUS,
  WORKFLOW_STEP_STATUS,
  INBOX_AI_USAGE_KIND,
  CALL_LOG_PROVIDER,
  CALL_DIRECTION,
  CALL_LOG_STATUS,
  SMS_LOG_PROVIDER,
  SMS_LOG_STATUS,
  COMPLIANCE_CHANNEL,
  COMPLIANCE_DECISION,
  CONSENT_KIND,
  SUPPRESSION_REASON,
} from './constants'

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

  [TABLES.TENANT_CONFIGS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    allowedAgents: v.union(v.literal('all'), v.array(v.string())),
    allowedIntegrations: v.union(v.literal('all'), v.array(v.string())),
    features: v.object({
      customWorkflows: v.boolean(),
      deepResearch: v.boolean(),
      outreachCampaigns: v.boolean(),
      prospectTable: v.boolean(),
      exaWebsets: v.boolean(),
      crmSync: v.boolean(),
      customSkills: v.boolean(),
      voiceMode: v.boolean(),
      workflowBuilder: v.boolean(),
      scheduledTasks: v.boolean(),
      /** Added 2026 — optional so legacy tenantConfigs rows validate until backfill. */
      videoStudio: v.optional(v.boolean()),
      unifiedInbox: v.optional(v.boolean()),
      eventTriggers: v.optional(v.boolean()),
      leadScoring: v.optional(v.boolean()),
    }),
    limits: v.object({
      maxMembers: v.number(),
      maxProspectsPerMonth: v.number(),
      maxWorkflows: v.number(),
      maxSchedules: v.number(),
      maxSkills: v.number(),
      monthlyCredits: v.number(),
      /** Added 2026 — optional so legacy tenantConfigs rows validate until backfill. */
      maxVideoGenerationsPerMonth: v.optional(v.number()),
      maxInboxSyncPerDay: v.optional(v.number()),
    }),
    billingModel: v.union(
      v.literal(BILLING_MODEL.UNLIMITED),
      v.literal(BILLING_MODEL.FLAT),
      v.literal(BILLING_MODEL.USAGE),
      v.literal(BILLING_MODEL.FLAT_PLUS_USAGE),
      v.literal(BILLING_MODEL.TRIAL),
      v.literal(BILLING_MODEL.FRIEND)
    ),
    adminNotes: v.optional(v.string()),
    /** Primary vertical; drives niche packs on the server. */
    nicheId: v.optional(
      v.union(v.literal('generic'), v.literal('real_estate'))
    ),
    nicheOverrides: v.optional(
      v.object({
        orchestratorAddendum: v.optional(v.string()),
      })
    ),
    /** When true, org bypasses niche/agent/feature gating (same as env allowlists). */
    fullPlatformAccess: v.optional(v.boolean()),
    /** Short org voice: who you are, what you sell, tone — used for inbox reply personalization. */
    orgReplyVoice: v.optional(v.string()),
    /** Minutes-per-action defaults for time-saved estimates; merged with niche defaults. */
    metricAssumptions: v.optional(
      v.object({
        researchMinutesPerProspectSnapshot: v.optional(v.number()),
        researchMinutesPerAdsRun: v.optional(v.number()),
        minutesPerOutreachSend: v.optional(v.number()),
        minutesPerInboxReply: v.optional(v.number()),
        minutesPerPersonalizedOutreach: v.optional(v.number()),
        minutesPerDeepResearchAssistantMessage: v.optional(v.number()),
        minutesPerResearchAgentAssistantMessage: v.optional(v.number()),
        minutesPerInboxDraftReply: v.optional(v.number()),
        minutesPerInboxSummarize: v.optional(v.number()),
      })
    ),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index(INDEXES.BY_TENANT_ID, ['tenantId']),

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
        deepResearch: v.optional(v.boolean()),
        targetAgent: v.optional(v.string()),
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
    .index(INDEXES.BY_TENANT_CREATED, ['tenantId', 'createdAt'])
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
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(
      v.union(
        v.literal(SUBSCRIPTION_STATUS.ACTIVE),
        v.literal(SUBSCRIPTION_STATUS.CANCELED),
        v.literal(SUBSCRIPTION_STATUS.PAST_DUE),
        v.literal(SUBSCRIPTION_STATUS.TRIALING)
      )
    ),
    currentPeriodEnd: v.optional(v.number()),
    monthlyBasePrice: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_STRIPE_CUSTOMER_ID, ['stripeCustomerId']),

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
      v.literal(CREDIT_ACTION.VIDEO_GENERATION),
      v.literal(CREDIT_ACTION.AUTOMATION_RUN),
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
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
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
      v.literal(PROSPECT_SOURCE.CSV_IMPORT),
      v.literal(PROSPECT_SOURCE.EXA_WEBSET)
    ),
    notes: v.optional(v.string()),
    customFields: v.optional(v.any()),
    /** Rule-based lead score 0–100; optional until scored */
    leadScore: v.optional(v.number()),
    scoreUpdatedAt: v.optional(v.number()),
    scoreBreakdown: v.optional(v.any()),
    scoreModelVersion: v.optional(v.string()),
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
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_RESEARCHED_AT, ['tenantId', 'researchedAt']),

  [TABLES.OUTREACH_DRAFTS]: defineTable({
    prospectId: v.id(TABLES.PROSPECTS),
    tenantId: v.id(TABLES.TENANTS),
    channel: v.union(
      v.literal(OUTREACH_CHANNEL.LINKEDIN),
      v.literal(OUTREACH_CHANNEL.EMAIL),
      v.literal(OUTREACH_CHANNEL.OUTLOOK),
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
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_SENT_AT, ['tenantId', 'sentAt']),

  [TABLES.CONTENT_DRAFTS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    scope: v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER)),
    platform: v.union(
      v.literal(CONTENT_PLATFORM.LINKEDIN),
      v.literal(CONTENT_PLATFORM.X),
      v.literal(CONTENT_PLATFORM.YOUTUBE),
      v.literal(CONTENT_PLATFORM.INSTAGRAM),
      v.literal(CONTENT_PLATFORM.TIKTOK)
    ),
    content: v.string(),
    title: v.optional(v.string()),
    status: v.union(
      v.literal(CONTENT_DRAFT_STATUS.DRAFT),
      v.literal(CONTENT_DRAFT_STATUS.READY),
      v.literal(CONTENT_DRAFT_STATUS.POSTED),
      v.literal(CONTENT_DRAFT_STATUS.SCHEDULED)
    ),
    scheduledFor: v.optional(v.number()),
    postedAt: v.optional(v.number()),
    externalIntegrationId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_TENANT_SCOPE, ['tenantId', 'scope'])
    .index(INDEXES.BY_TENANT_PLATFORM, ['tenantId', 'platform']),

  // ─── Schedules ──────────────────────────────────────────────────────────────

  [TABLES.SCHEDULES]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    name: v.string(),
    description: v.optional(v.string()),
    cronExpression: v.string(),
    timezone: v.string(),
    action: v.object({
      type: v.union(
        v.literal(SCHEDULE_ACTION_TYPE.WORKFLOW),
        v.literal(SCHEDULE_ACTION_TYPE.AGENT_PROMPT)
      ),
      workflowId: v.optional(v.id(TABLES.WORKFLOW_DEFINITIONS)),
      agentPrompt: v.optional(v.string()),
      inputData: v.optional(v.any()),
    }),
    isEnabled: v.boolean(),
    autoApprove: v.boolean(),
    lastRunAt: v.optional(v.number()),
    nextRunAt: v.optional(v.number()),
    lastRunStatus: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_NEXT_RUN_AT, ['nextRunAt']),

  [TABLES.SCHEDULE_LOGS]: defineTable({
    scheduleId: v.id(TABLES.SCHEDULES),
    tenantId: v.id(TABLES.TENANTS),
    runId: v.optional(v.string()),
    status: v.union(
      v.literal(SCHEDULE_LOG_STATUS.RUNNING),
      v.literal(SCHEDULE_LOG_STATUS.SUCCESS),
      v.literal(SCHEDULE_LOG_STATUS.FAILED),
      v.literal(SCHEDULE_LOG_STATUS.SUSPENDED)
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    result: v.optional(v.any()),
  })
    .index(INDEXES.BY_SCHEDULE_ID, ['scheduleId'])
    .index(INDEXES.BY_TENANT_ID, ['tenantId']),

  // ─── Workflow Definitions & Runs ───────────────────────────────────────────

  [TABLES.WORKFLOW_DEFINITIONS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    name: v.string(),
    description: v.optional(v.string()),
    definition: v.any(),
    isPublished: v.boolean(),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_ID, ['userId']),

  [TABLES.WORKFLOW_RUNS]: defineTable({
    workflowDefinitionId: v.id(TABLES.WORKFLOW_DEFINITIONS),
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    mastraRunId: v.optional(v.string()),
    status: v.union(
      v.literal(WORKFLOW_RUN_STATUS.PENDING),
      v.literal(WORKFLOW_RUN_STATUS.RUNNING),
      v.literal(WORKFLOW_RUN_STATUS.SUSPENDED),
      v.literal(WORKFLOW_RUN_STATUS.SUCCESS),
      v.literal(WORKFLOW_RUN_STATUS.FAILED)
    ),
    inputData: v.optional(v.any()),
    result: v.optional(v.any()),
    suspendedAt: v.optional(v.string()),
    autoApprove: v.boolean(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index(INDEXES.BY_WORKFLOW_DEFINITION_ID, ['workflowDefinitionId'])
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_ID, ['userId']),

  [TABLES.WORKFLOW_RUN_STEPS]: defineTable({
    runId: v.id(TABLES.WORKFLOW_RUNS),
    stepId: v.string(),
    status: v.union(
      v.literal(WORKFLOW_STEP_STATUS.PENDING),
      v.literal(WORKFLOW_STEP_STATUS.RUNNING),
      v.literal(WORKFLOW_STEP_STATUS.SUCCESS),
      v.literal(WORKFLOW_STEP_STATUS.FAILED),
      v.literal(WORKFLOW_STEP_STATUS.SUSPENDED)
    ),
    inputData: v.optional(v.any()),
    outputData: v.optional(v.any()),
    suspendPayload: v.optional(v.any()),
    resumeData: v.optional(v.any()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index(INDEXES.BY_RUN_ID, ['runId']),

  // ─── Dashboard & Daily Todos ───────────────────────────────────────────────

  [TABLES.DAILY_TODOS]: defineTable({
    userId: v.id(TABLES.USERS),
    date: v.string(),
    items: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        completed: v.boolean(),
        order: v.number(),
        source: v.optional(v.string()),
      })
    ),
    updatedAt: v.number(),
  }).index(INDEXES.BY_USER_ID_DATE, ['userId', 'date']),

  [TABLES.USER_DASHBOARD_PREFERENCES]: defineTable({
    userId: v.id(TABLES.USERS),
    enabledWidgets: v.array(v.string()),
    widgetOrder: v.optional(v.array(v.number())),
    /** Sub-metric toggles for the time-savings widget (e.g. research_hours, outreach). */
    enabledMetricIds: v.optional(v.array(v.string())),
    updatedAt: v.number(),
  }).index(INDEXES.BY_USER_ID, ['userId']),

  [TABLES.INBOX_OUTBOUND_EVENTS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    threadId: v.optional(v.id(TABLES.INBOX_THREADS)),
    provider: v.union(
      v.literal(INBOX_PROVIDER.GMAIL),
      v.literal(INBOX_PROVIDER.OUTLOOK),
      v.literal(INBOX_PROVIDER.WHATSAPP),
      v.literal(INBOX_PROVIDER.SMS)
    ),
    sentAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_INBOX_OUTBOUND_SENT_AT, ['tenantId', 'sentAt']),

  [TABLES.INBOX_AI_USAGE]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    kind: v.union(
      v.literal(INBOX_AI_USAGE_KIND.DRAFT_REPLY),
      v.literal(INBOX_AI_USAGE_KIND.SUMMARIZE)
    ),
    createdAt: v.number(),
  }).index(INDEXES.BY_TENANT_INBOX_AI_CREATED, ['tenantId', 'createdAt']),

  // ─── Mastra Workflow Storage ───────────────────────────────────────────────

  [TABLES.WORKFLOW_SNAPSHOTS]: defineTable({
    runId: v.string(),
    workflowName: v.string(),
    resourceId: v.optional(v.string()),
    snapshot: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_SNAPSHOT_RUN_ID, ['runId'])
    .index(INDEXES.BY_WORKFLOW_RUN, ['workflowName', 'runId']),

  [TABLES.CHAT_GENERATION_JOBS]: defineTable({
    threadId: v.string(),
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    status: v.union(
      v.literal(CHAT_JOB_STATUS.PENDING),
      v.literal(CHAT_JOB_STATUS.RUNNING),
      v.literal(CHAT_JOB_STATUS.COMPLETED),
      v.literal(CHAT_JOB_STATUS.FAILED)
    ),
    progressMessage: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index(INDEXES.BY_THREAD_CREATED, ['threadId', 'createdAt']),

  [TABLES.USER_AGENT_SETTINGS]: defineTable({
    userId: v.id(TABLES.USERS),
    tenantId: v.id(TABLES.TENANTS),
    instructionsByAgentId: v.record(v.string(), v.string()),
    updatedAt: v.number(),
  }).index(INDEXES.BY_USER_ID, ['userId']),

  [TABLES.AUTOMATION_TRIGGERS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    composioTriggerId: v.string(),
    toolkit: v.string(),
    triggerSlug: v.string(),
    config: v.optional(v.any()),
    isEnabled: v.boolean(),
    action: v.object({
      type: v.union(
        v.literal(SCHEDULE_ACTION_TYPE.WORKFLOW),
        v.literal(SCHEDULE_ACTION_TYPE.AGENT_PROMPT)
      ),
      workflowId: v.optional(v.id(TABLES.WORKFLOW_DEFINITIONS)),
      agentPrompt: v.optional(v.string()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_COMPOSIO_TRIGGER_ID, ['composioTriggerId']),

  [TABLES.INBOX_THREADS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    provider: v.union(
      v.literal(INBOX_PROVIDER.GMAIL),
      v.literal(INBOX_PROVIDER.OUTLOOK),
      v.literal(INBOX_PROVIDER.WHATSAPP),
      v.literal(INBOX_PROVIDER.SMS)
    ),
    externalThreadId: v.string(),
    subject: v.optional(v.string()),
    snippet: v.optional(v.string()),
    lastMessageAt: v.number(),
    participantEmails: v.array(v.string()),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    needsReply: v.boolean(),
    metadata: v.optional(v.any()),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_USER_PROVIDER_EXTERNAL_THREAD, [
      'userId',
      'provider',
      'externalThreadId',
    ]),

  [TABLES.INBOX_MESSAGES]: defineTable({
    threadId: v.id(TABLES.INBOX_THREADS),
    externalMessageId: v.string(),
    sentAt: v.number(),
    /** Legacy display field; for email equals address; for WhatsApp often phone or wa id */
    fromEmail: v.string(),
    senderId: v.optional(v.string()),
    senderLabel: v.optional(v.string()),
    bodyPreview: v.string(),
    isOutbound: v.boolean(),
    createdAt: v.number(),
  })
    .index(INDEXES.BY_INBOX_THREAD_SENT_AT, ['threadId', 'sentAt'])
    .index(INDEXES.BY_INBOX_THREAD_MESSAGE, ['threadId', 'externalMessageId']),

  [TABLES.INBOX_SYNC_USAGE]: defineTable({
    userId: v.id(TABLES.USERS),
    /** UTC calendar date YYYY-MM-DD */
    dateKey: v.string(),
    syncCount: v.number(),
    updatedAt: v.number(),
  }).index(INDEXES.BY_INBOX_SYNC_USER_DATE, ['userId', 'dateKey']),

  [TABLES.VIDEO_GENERATION_JOBS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    status: v.union(
      v.literal(VIDEO_JOB_STATUS.QUEUED),
      v.literal(VIDEO_JOB_STATUS.RUNNING),
      v.literal(VIDEO_JOB_STATUS.COMPLETED),
      v.literal(VIDEO_JOB_STATUS.FAILED)
    ),
    provider: v.string(),
    prompt: v.string(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_VIDEO_JOB_USER_CREATED, ['userId', 'createdAt']),

  [TABLES.MEDIA_ASSETS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    status: v.union(
      v.literal(MEDIA_ASSET_STATUS.DRAFT),
      v.literal(MEDIA_ASSET_STATUS.READY),
      v.literal(MEDIA_ASSET_STATUS.POSTING),
      v.literal(MEDIA_ASSET_STATUS.POSTED),
      v.literal(MEDIA_ASSET_STATUS.FAILED)
    ),
    videoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    platformIntent: v.string(),
    publishId: v.optional(v.string()),
    jobId: v.optional(v.id(TABLES.VIDEO_GENERATION_JOBS)),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_MEDIA_TENANT_CREATED, ['tenantId', 'createdAt']),

  [TABLES.ADS_PIPELINE_RUNS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    status: v.union(
      v.literal(ADS_PIPELINE_RUN_STATUS.PENDING),
      v.literal(ADS_PIPELINE_RUN_STATUS.SCRAPING),
      v.literal(ADS_PIPELINE_RUN_STATUS.ANALYZING),
      v.literal(ADS_PIPELINE_RUN_STATUS.BUILDING),
      v.literal(ADS_PIPELINE_RUN_STATUS.COMPLETED),
      v.literal(ADS_PIPELINE_RUN_STATUS.FAILED)
    ),
    currentStage: v.optional(v.string()),
    query: v.string(),
    platforms: v.array(v.string()),
    focusArea: v.optional(v.string()),
    requestedEngines: v.array(v.string()),
    completedEngines: v.array(v.string()),
    cachedSearchRefs: v.array(
      v.object({
        engine: v.string(),
        searchId: v.string(),
        ok: v.boolean(),
        error: v.optional(v.string()),
      })
    ),
    analysisMarkdown: v.optional(v.string()),
    campaignBriefMarkdown: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index(INDEXES.BY_ADS_PIPELINE_TENANT_CREATED, ['tenantId', 'createdAt'])
    .index(INDEXES.BY_ADS_PIPELINE_USER_CREATED, ['userId', 'createdAt'])
    .index(INDEXES.BY_ADS_PIPELINE_TENANT_STATUS, ['tenantId', 'status'])
    .index(INDEXES.BY_TENANT_COMPLETED_AT, ['tenantId', 'completedAt']),

  [TABLES.MARKETING_CAMPAIGN_METRICS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    source: v.union(
      v.literal(MARKETING_METRIC_SOURCE.LEMLIST),
      v.literal(MARKETING_METRIC_SOURCE.APOLLO),
      v.literal(MARKETING_METRIC_SOURCE.MAILCHIMP)
    ),
    externalId: v.string(),
    label: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    metrics: v.object({
      sent: v.optional(v.number()),
      replied: v.optional(v.number()),
      opened: v.optional(v.number()),
      bounced: v.optional(v.number()),
      clicked: v.optional(v.number()),
    }),
    syncedAt: v.number(),
    rawPayload: v.optional(v.any()),
  })
    .index(INDEXES.BY_USER_ID, ['userId'])
    .index(INDEXES.BY_MARKETING_USER_SOURCE, ['userId', 'source'])
    .index(INDEXES.BY_MARKETING_TENANT_USER_SYNCED, ['tenantId', 'userId', 'syncedAt']),

  [TABLES.AUDIT_SUBMISSIONS]: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.string(),
    roleOther: v.optional(v.string()),
    teamSize: v.string(),
    topTasks: v.string(),
    weeklyManualHours: v.string(),
    oneTaskToHandOff: v.string(),
    currentTools: v.array(v.string()),
    toolsOther: v.optional(v.string()),
    toolFrustration: v.string(),
    offToolProcesses: v.string(),
    biggestChallenge: v.string(),
    biggestChallengeOther: v.optional(v.string()),
    aiExperience: v.string(),
    aiWishIn30Days: v.string(),
    monthlyLeads: v.string(),
    annualRevenue: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('delivered')
    ),
    reportUrl: v.optional(v.string()),
    reportMarkdown: v.optional(v.string()),
    hoursSavedPerWeekMin: v.optional(v.number()),
    hoursSavedPerWeekMax: v.optional(v.number()),
    submittedAt: v.number(),
  })
    .index(INDEXES.BY_AUDIT_EMAIL, ['email'])
    .index(INDEXES.BY_AUDIT_STATUS, ['status']),

  // ─── Voice / SMS activity (Retell, Callingly, SMS providers) ───────────────

  [TABLES.CALL_LOGS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    provider: v.union(
      v.literal(CALL_LOG_PROVIDER.RETELL),
      v.literal(CALL_LOG_PROVIDER.CALLINGLY),
      v.literal(CALL_LOG_PROVIDER.OTHER)
    ),
    externalCallId: v.string(),
    direction: v.union(
      v.literal(CALL_DIRECTION.INBOUND),
      v.literal(CALL_DIRECTION.OUTBOUND)
    ),
    durationMs: v.optional(v.number()),
    transcript: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    analysis: v.optional(v.any()),
    status: v.union(
      v.literal(CALL_LOG_STATUS.INITIATED),
      v.literal(CALL_LOG_STATUS.RINGING),
      v.literal(CALL_LOG_STATUS.IN_PROGRESS),
      v.literal(CALL_LOG_STATUS.ENDED),
      v.literal(CALL_LOG_STATUS.FAILED),
      v.literal(CALL_LOG_STATUS.ANALYZED)
    ),
    retellAgentId: v.optional(v.string()),
    workflowRunId: v.optional(v.id(TABLES.WORKFLOW_RUNS)),
    complianceSnapshot: v.optional(
      v.object({
        policyVersion: v.string(),
        decision: v.union(
          v.literal(COMPLIANCE_DECISION.ALLOW),
          v.literal(COMPLIANCE_DECISION.BLOCK)
        ),
        reasonCodes: v.array(v.string()),
      })
    ),
    rawPayload: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_PROSPECT_ID, ['prospectId'])
    .index(INDEXES.BY_EXTERNAL_CALL_ID, ['externalCallId']),

  [TABLES.SMS_LOGS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    provider: v.union(
      v.literal(SMS_LOG_PROVIDER.SMS_ALERT),
      v.literal(SMS_LOG_PROVIDER.TWILIO),
      v.literal(SMS_LOG_PROVIDER.TELNYX),
      v.literal(SMS_LOG_PROVIDER.OTHER)
    ),
    externalMessageId: v.optional(v.string()),
    direction: v.union(
      v.literal(CALL_DIRECTION.INBOUND),
      v.literal(CALL_DIRECTION.OUTBOUND)
    ),
    body: v.string(),
    status: v.union(
      v.literal(SMS_LOG_STATUS.QUEUED),
      v.literal(SMS_LOG_STATUS.SENT),
      v.literal(SMS_LOG_STATUS.DELIVERED),
      v.literal(SMS_LOG_STATUS.FAILED),
      v.literal(SMS_LOG_STATUS.RECEIVED),
      v.literal(SMS_LOG_STATUS.REPLIED)
    ),
    replyBody: v.optional(v.string()),
    workflowRunId: v.optional(v.id(TABLES.WORKFLOW_RUNS)),
    complianceSnapshot: v.optional(
      v.object({
        policyVersion: v.string(),
        decision: v.union(
          v.literal(COMPLIANCE_DECISION.ALLOW),
          v.literal(COMPLIANCE_DECISION.BLOCK)
        ),
        reasonCodes: v.array(v.string()),
      })
    ),
    rawPayload: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_PROSPECT_ID, ['prospectId']),

  [TABLES.COMPLIANCE_CONTACTS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    prospectId: v.optional(v.id(TABLES.PROSPECTS)),
    phone: v.string(),
    timezone: v.optional(v.string()),
    stateCode: v.optional(v.string()),
    source: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_PHONE, ['tenantId', 'phone'])
    .index(INDEXES.BY_TENANT_STATE, ['tenantId', 'stateCode']),

  [TABLES.DNC_ENTRIES]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    phone: v.string(),
    scope: v.union(
      v.literal('national'),
      v.literal('state'),
      v.literal('internal')
    ),
    stateCode: v.optional(v.string()),
    source: v.optional(v.string()),
    checkedAt: v.number(),
    expiresAt: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_PHONE, ['tenantId', 'phone'])
    .index(INDEXES.BY_TENANT_STATE, ['tenantId', 'stateCode']),

  [TABLES.CONSENT_RECORDS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    phone: v.string(),
    kind: v.union(
      v.literal(CONSENT_KIND.VOICE),
      v.literal(CONSENT_KIND.SMS),
      v.literal(CONSENT_KIND.EMAIL)
    ),
    evidenceUrl: v.optional(v.string()),
    evidenceHash: v.optional(v.string()),
    signedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_PHONE, ['tenantId', 'phone']),

  [TABLES.COMPLIANCE_POLICIES]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    stateCode: v.string(),
    policyVersion: v.string(),
    quietHoursStart: v.number(),
    quietHoursEnd: v.number(),
    requireSmsConsent: v.boolean(),
    requireVoiceConsent: v.boolean(),
    requireAiDisclosure: v.boolean(),
    requireOptOutPrompt: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_STATE, ['tenantId', 'stateCode']),

  [TABLES.SUPPRESSION_LISTS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    phone: v.string(),
    channel: v.union(
      v.literal(COMPLIANCE_CHANNEL.VOICE_CALL),
      v.literal(COMPLIANCE_CHANNEL.SMS),
      v.literal(COMPLIANCE_CHANNEL.EMAIL)
    ),
    reason: v.union(
      v.literal(SUPPRESSION_REASON.DNC),
      v.literal(SUPPRESSION_REASON.OPTOUT),
      v.literal(SUPPRESSION_REASON.MANUAL)
    ),
    active: v.boolean(),
    source: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_PHONE, ['tenantId', 'phone'])
    .index(INDEXES.BY_TENANT_CHANNEL_PHONE, ['tenantId', 'channel', 'phone']),

  [TABLES.COMPLIANCE_AUDIT_EVENTS]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    workflowRunId: v.optional(v.id(TABLES.WORKFLOW_RUNS)),
    channel: v.union(
      v.literal(COMPLIANCE_CHANNEL.VOICE_CALL),
      v.literal(COMPLIANCE_CHANNEL.SMS),
      v.literal(COMPLIANCE_CHANNEL.EMAIL)
    ),
    phone: v.string(),
    stateCode: v.optional(v.string()),
    timezone: v.optional(v.string()),
    policyVersion: v.string(),
    decision: v.union(
      v.literal(COMPLIANCE_DECISION.ALLOW),
      v.literal(COMPLIANCE_DECISION.BLOCK)
    ),
    reasonCodes: v.array(v.string()),
    payload: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_DECISION_CREATED, ['tenantId', 'decision', 'createdAt']),

  [TABLES.LEGAL_ACCEPTANCES]: defineTable({
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    documentKey: v.union(
      v.literal('terms'),
      v.literal('privacy'),
      v.literal('compliance_agreement')
    ),
    version: v.string(),
    acceptedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index(INDEXES.BY_TENANT_ID, ['tenantId'])
    .index(INDEXES.BY_TENANT_USER_DOC_VERSION, ['tenantId', 'userId', 'documentKey', 'version']),
})
