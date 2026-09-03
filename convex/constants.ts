// ─── Table Names ─────────────────────────────────────────────────────────────

export const TABLES = {
  TENANTS: 'tenants',
  TENANT_CONFIGS: 'tenantConfigs',
  USERS: 'users',
  USER_INTEGRATIONS: 'userIntegrations',
  UNIPILE_ACCOUNTS: 'unipileAccounts',
  TENANT_SKILLS: 'tenantSkills',
  SKILL_CONTENT: 'skillContent',
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
  SCHEDULES: 'schedules',
  SCHEDULE_LOGS: 'scheduleLogs',
  WORKFLOW_DEFINITIONS: 'workflowDefinitions',
  WORKFLOW_RUNS: 'workflowRuns',
  WORKFLOW_RUN_STEPS: 'workflowRunSteps',
  DAILY_TODOS: 'dailyTodos',
  USER_DASHBOARD_PREFERENCES: 'userDashboardPreferences',
  CONTENT_DRAFTS: 'contentDrafts',
  WORKFLOW_SNAPSHOTS: 'workflowSnapshots',
  CHAT_GENERATION_JOBS: 'chatGenerationJobs',
  USER_AGENT_SETTINGS: 'userAgentSettings',
  AUTOMATION_TRIGGERS: 'automationTriggers',
  INBOX_THREADS: 'inboxThreads',
  INBOX_MESSAGES: 'inboxMessages',
  INBOX_SYNC_USAGE: 'inboxSyncUsage',
  VIDEO_GENERATION_JOBS: 'videoGenerationJobs',
  MEDIA_ASSETS: 'mediaAssets',
  ADS_PIPELINE_RUNS: 'adsPipelineRuns',
  MARKETING_CAMPAIGN_METRICS: 'marketingCampaignMetrics',
  INBOX_OUTBOUND_EVENTS: 'inboxOutboundEvents',
  /** AI draft reply vs thread summarize from unified inbox (time-savings). */
  INBOX_AI_USAGE: 'inboxAiUsage',
  /** Public marketing — free AI audit questionnaire submissions. */
  AUDIT_SUBMISSIONS: 'auditSubmissions',
  /** Cached industry research briefs used to ground audit reports (7-day TTL). */
  INDUSTRY_BRIEFS: 'industryBriefs',
  CALL_LOGS: 'callLogs',
  SMS_LOGS: 'smsLogs',
  COMPLIANCE_CONTACTS: 'complianceContacts',
  DNC_ENTRIES: 'dncEntries',
  CONSENT_RECORDS: 'consentRecords',
  COMPLIANCE_POLICIES: 'compliancePolicies',
  COMPLIANCE_AUDIT_EVENTS: 'complianceAuditEvents',
  SUPPRESSION_LISTS: 'suppressionLists',
  LEGAL_ACCEPTANCES: 'legalAcceptances',
  MARKETING_CHAT_LEADS: 'marketingChatLeads',
  WORKSPACE_DOCUMENTS: 'workspaceDocuments',
  WORKSPACE_FOLDERS: 'workspaceFolders',
  /** Durable per-agent invocation state (orchestrator + delegated sub-agents). */
  AGENT_RUNS: 'agentRuns',
  /** Append-only milestone log for agentRuns (UI live-subscribes). */
  RUN_PROGRESS: 'runProgress',
  /** Kind-tagged payloads produced by tool calls (e.g. `exa.websetItems`). */
  ARTIFACTS: 'artifacts',
  /** Parent->child delegation hop log written by the supervisor hook. */
  DELEGATIONS: 'delegations',
  /** Cached Exa webset items pulled by the past-websets cron. */
  WEBSET_ITEMS: 'websetItems',
  /** Pending/resolved human-approval requests for destructive tool calls (MCP elicitation). */
  APPROVALS: 'approvals',
  /** Seller Reply OS — properties linked to prospects / inbound threads. */
  PROPERTIES: 'properties',
  /** Seller Reply OS — per-thread classification and queue state. */
  REPLY_TRIAGE: 'replyTriage',
  /** Seller Reply OS — SMS/reply drafts awaiting operator approval. */
  REPLY_DRAFTS: 'replyDrafts',
  /** Seller Reply OS — inbound adapter poll runs (SMS webhook / Smarter Contact). */
  REPLY_ADAPTER_RUNS: 'replyAdapterRuns',
} as const

// ─── Index Names ─────────────────────────────────────────────────────────────

export const INDEXES = {
  BY_CLERK_ORG_ID: 'by_clerkOrgId',
  BY_CLERK_USER_ID: 'by_clerkUserId',
  BY_TENANT_ID: 'by_tenantId',
  BY_USER_ID: 'by_userId',
  BY_USER_PROVIDER: 'by_userId_provider',
  BY_CONNECTION_ID: 'by_connectionId',
  BY_EXTERNAL_ACCOUNT_ID: 'by_externalAccountId',
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
  BY_TENANT_SKILL_NAME: 'by_tenantId_skillName',
  BY_SCHEDULE_ID: 'by_scheduleId',
  BY_NEXT_RUN_AT: 'by_nextRunAt',
  BY_WORKFLOW_DEFINITION_ID: 'by_workflowDefinitionId',
  BY_RUN_ID: 'by_runId',
  BY_STRIPE_CUSTOMER_ID: 'by_stripeCustomerId',
  BY_USER_ID_DATE: 'by_userId_date',
  BY_TENANT_PLATFORM: 'by_tenantId_platform',
  BY_WORKFLOW_RUN: 'by_workflowName_runId',
  BY_SNAPSHOT_RUN_ID: 'by_snapshot_runId',
  BY_USER_PROVIDER_EXTERNAL_THREAD: 'by_userId_provider_externalThreadId',
  BY_INBOX_THREAD_SENT_AT: 'by_threadId_sentAt',
  BY_INBOX_THREAD_MESSAGE: 'by_threadId_externalMessageId',
  BY_INBOX_SYNC_USER_DATE: 'by_userId_dateKey',
  BY_COMPOSIO_TRIGGER_ID: 'by_composioTriggerId',
  BY_EXTERNAL_CALL_ID: 'by_externalCallId',
  BY_VIDEO_JOB_USER_CREATED: 'by_userId_createdAt',
  BY_MEDIA_TENANT_CREATED: 'by_tenantId_createdAt',
  BY_ADS_PIPELINE_TENANT_CREATED: 'by_tenantId_createdAt',
  BY_ADS_PIPELINE_USER_CREATED: 'by_userId_createdAt',
  BY_ADS_PIPELINE_TENANT_STATUS: 'by_tenantId_status',
  BY_MARKETING_USER_SOURCE: 'by_userId_source',
  BY_MARKETING_TENANT_USER_SYNCED: 'by_tenantId_userId_syncedAt',
  BY_TENANT_RESEARCHED_AT: 'by_tenantId_researchedAt',
  /** outreachDrafts.sentAt (optional until sent) */
  BY_TENANT_SENT_AT: 'by_tenantId_sentAt',
  /** inboxOutboundEvents.sentAt */
  BY_TENANT_INBOX_OUTBOUND_SENT_AT: 'by_tenantId_inboxOutboundSentAt',
  BY_TENANT_COMPLETED_AT: 'by_tenantId_completedAt',
  /** inboxAiUsage — range on tenant + time */
  BY_TENANT_INBOX_AI_CREATED: 'by_tenantId_inboxAiCreatedAt',
  BY_AUDIT_EMAIL: 'by_audit_email',
  BY_AUDIT_STATUS: 'by_audit_status',
  /** industryBriefs.industrySlug — primary cache key */
  BY_INDUSTRY_SLUG: 'by_industry_slug',
  BY_TENANT_PHONE: 'by_tenantId_phone',
  BY_TENANT_CHANNEL_PHONE: 'by_tenantId_channel_phone',
  BY_TENANT_STATE: 'by_tenantId_stateCode',
  BY_TENANT_DECISION_CREATED: 'by_tenantId_decision_createdAt',
  BY_TENANT_USER_DOC_VERSION: 'by_tenantId_userId_documentKey_version',
  BY_MARKETING_LEAD_EMAIL: 'by_marketingLead_email',
  BY_MARKETING_LEAD_SESSION: 'by_marketingLead_sessionId',
  BY_WORKSPACE_FOLDER_ID: 'by_workspaceFolderId',
  BY_TENANT_WORKSPACE_STATUS: 'by_tenantId_workspaceDocStatus',
  /** agentRuns: latest runs per tenant. */
  BY_TENANT_UPDATED: 'by_tenantId_updatedAt',
  /** agentRuns: filter by thread or parent run. */
  BY_THREAD_ID: 'by_threadId',
  BY_PARENT_RUN_ID: 'by_parentRunId',
  /** runProgress: ordered stream per run. */
  BY_RUN_CREATED: 'by_runId_createdAt',
  /** artifacts: lookup per run or tenant + kind. */
  BY_ARTIFACT_RUN: 'by_runId',
  BY_ARTIFACT_TENANT_KIND: 'by_tenantId_kind',
  /** delegations: parent hop ordering. */
  BY_PARENT_CREATED: 'by_parentRunId_createdAt',
  /** websetItems: list items by tenant + webset, and dedupe by tenant + itemKey. */
  BY_TENANT_WEBSET: 'by_tenantId_websetId',
  BY_TENANT_ITEM_KEY: 'by_tenantId_itemKey',
  BY_WEBSET_ID: 'by_websetId',
  /** approvals: lookup by opaque token and by tenant + status. */
  BY_APPROVAL_TOKEN: 'by_approvalToken',
  BY_TENANT_STATUS_CREATED: 'by_tenantId_status_createdAt',
  /** replyTriage: queue by tenant + status + tag. */
  BY_TENANT_STATUS_TAG: 'by_tenantId_status_tag',
  /** replyTriage: recency by tenant. */
  BY_TENANT_CLASSIFIED_AT: 'by_tenantId_classifiedAt',
  /** replyAdapterRuns: recency by tenant. */
  BY_TENANT_STARTED_AT: 'by_tenantId_startedAt',
} as const

/**
 * approvals.status — lifecycle of a destructive-tool elicitation request.
 * PENDING is the initial state; APPROVED allows the next tool call to execute;
 * REJECTED and EXPIRED are terminal and block execution.
 */
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const

/** inboxAiUsage.kind */
export const INBOX_AI_USAGE_KIND = {
  DRAFT_REPLY: 'draft_reply',
  SUMMARIZE: 'summarize',
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
  VIDEO_GENERATION: 'video_generation',
  AUTOMATION_RUN: 'automation_run',
  TRIAL_GRANT: 'trial_grant',
  PURCHASE: 'purchase',
  ADMIN_GRANT: 'admin_grant',
  TRIAL_EXPIRED: 'trial_expired',
} as const

export const CREDIT_COSTS = {
  [CREDIT_ACTION.CHAT_MESSAGE]: 1,
  [CREDIT_ACTION.TOOL_EXECUTION]: 2,
  [CREDIT_ACTION.VIDEO_GENERATION]: 10,
  [CREDIT_ACTION.AUTOMATION_RUN]: 2,
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

/** Source system for rows in marketingCampaignMetrics. */
export const MARKETING_METRIC_SOURCE = {
  LEMLIST: 'lemlist',
  APOLLO: 'apollo',
  MAILCHIMP: 'mailchimp',
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

/** Workspace knowledge documents (files, links, notes). */
export const WORKSPACE_DOC_TYPE = {
  PDF: 'pdf',
  VIDEO: 'video',
  AUDIO: 'audio',
  IMAGE: 'image',
  WEBPAGE: 'webpage',
  YOUTUBE: 'youtube',
  TEXT: 'text',
  NOTE: 'note',
} as const

export const WORKSPACE_DOC_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  ERROR: 'error',
} as const

// ─── Content Drafts ───────────────────────────────────────────────────────────

export const CONTENT_PLATFORM = {
  LINKEDIN: 'linkedin',
  X: 'x',
  YOUTUBE: 'youtube',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
} as const

export const CONTENT_DRAFT_STATUS = {
  DRAFT: 'draft',
  READY: 'ready',
  POSTED: 'posted',
  SCHEDULED: 'scheduled',
} as const

export const SKILL_SOURCE = {
  AUTHORED: 'authored',
  INSTALLED: 'installed',
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
  EXA_WEBSET: 'exa_webset',
  MARKETING_CHAT: 'marketing_chat',
} as const

export const OUTREACH_CHANNEL = {
  LINKEDIN: 'linkedin',
  EMAIL: 'email',
  OUTLOOK: 'outlook',
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

// ─── Schedule System ──────────────────────────────────────────────────────────

export const SCHEDULE_ACTION_TYPE = {
  WORKFLOW: 'workflow',
  AGENT_PROMPT: 'agent_prompt',
} as const

export const SCHEDULE_LOG_STATUS = {
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  SUSPENDED: 'suspended',
} as const

// ─── Workflow System ──────────────────────────────────────────────────────────

export const CHAT_JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

/**
 * agentRuns.status — lifecycle of a single agent invocation (orchestrator OR sub-agent).
 * SUSPENDED covers workflow-level pauses (approvals, MCP elicitation). CANCELLED is a
 * user-initiated stop. Values are distinct from CHAT_JOB_STATUS so traces stay readable.
 */
export const AGENT_RUN_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUSPENDED: 'suspended',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const

export const WORKFLOW_RUN_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUSPENDED: 'suspended',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const

export const WORKFLOW_STEP_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  SUSPENDED: 'suspended',
} as const

/** Voice / telephony provider for callLogs */
export const CALL_LOG_PROVIDER = {
  RETELL: 'retell',
  CALLINGLY: 'callingly',
  OTHER: 'other',
} as const

export const CALL_DIRECTION = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const

export const CALL_LOG_STATUS = {
  INITIATED: 'initiated',
  RINGING: 'ringing',
  IN_PROGRESS: 'in_progress',
  ENDED: 'ended',
  FAILED: 'failed',
  ANALYZED: 'analyzed',
} as const

/** SMS / messaging provider for smsLogs */
export const SMS_LOG_PROVIDER = {
  SMS_ALERT: 'sms_alert',
  TWILIO: 'twilio',
  TELNYX: 'telnyx',
  OTHER: 'other',
} as const

export const SMS_LOG_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RECEIVED: 'received',
  REPLIED: 'replied',
} as const

export const COMPLIANCE_CHANNEL = {
  VOICE_CALL: 'voice_call',
  SMS: 'sms',
  EMAIL: 'email',
} as const

export const COMPLIANCE_DECISION = {
  ALLOW: 'allow',
  BLOCK: 'block',
} as const

export const SUPPRESSION_REASON = {
  DNC: 'dnc',
  OPTOUT: 'optout',
  MANUAL: 'manual',
} as const

export const CONSENT_KIND = {
  VOICE: 'voice',
  SMS: 'sms',
  EMAIL: 'email',
} as const

// ─── Tenant Config / Billing Model ───────────────────────────────────────────

export const BILLING_MODEL = {
  UNLIMITED: 'unlimited',
  FLAT: 'flat',
  USAGE: 'usage',
  FLAT_PLUS_USAGE: 'flat_plus_usage',
  TRIAL: 'trial',
  FRIEND: 'friend',
} as const

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
} as const

/** Feature flag keys for tenant config */
export const FEATURE_FLAGS = {
  CUSTOM_WORKFLOWS: 'customWorkflows',
  DEEP_RESEARCH: 'deepResearch',
  OUTREACH_CAMPAIGNS: 'outreachCampaigns',
  PROSPECT_TABLE: 'prospectTable',
  EXA_WEBSETS: 'exaWebsets',
  CRM_SYNC: 'crmSync',
  CUSTOM_SKILLS: 'customSkills',
  VOICE_MODE: 'voiceMode',
  WORKFLOW_BUILDER: 'workflowBuilder',
  SCHEDULED_TASKS: 'scheduledTasks',
  VIDEO_STUDIO: 'videoStudio',
  UNIFIED_INBOX: 'unifiedInbox',
  EVENT_TRIGGERS: 'eventTriggers',
  SELLER_REPLY_OS: 'sellerReplyOs',
} as const

export const INBOX_PROVIDER = {
  GMAIL: 'gmail',
  OUTLOOK: 'outlook',
  LINKEDIN: 'linkedin',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  /** Browser-imported Smarter Contact Messenger threads — never sendable. */
  SMARTER_CONTACT: 'smarter_contact',
} as const

export const REPLY_TAG = {
  IGNORE: 'ignore',
  LATER: 'later',
  HUMAN_NOW: 'human_now',
  DEAL: 'deal',
} as const

export const TRIAGE_STATUS = {
  OPEN: 'open',
  HANDLED: 'handled',
  SNOOZED: 'snoozed',
} as const

export const PROPERTY_KIND = {
  LAND: 'land',
  HOUSE: 'house',
} as const

export const REPLY_ADAPTER = {
  SMS_WEBHOOK: 'sms_webhook',
  SMARTER_CONTACT_BROWSER: 'smarter_contact_browser',
} as const

export const REPLY_ADAPTER_RUN_STATUS = {
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
} as const

export const ADS_PIPELINE_RUN_STATUS = {
  PENDING: 'pending',
  SCRAPING: 'scraping',
  ANALYZING: 'analyzing',
  BUILDING: 'building',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export const VIDEO_JOB_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export const MEDIA_ASSET_STATUS = {
  DRAFT: 'draft',
  READY: 'ready',
  POSTING: 'posting',
  POSTED: 'posted',
  FAILED: 'failed',
} as const
