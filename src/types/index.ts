// ─── Tenant & User ───────────────────────────────────────────────────────────

import type { TenantConfig } from '@/constants/featureGating'

export interface TenantContext {
  tenantId: string
  userId: string
  userEmail?: string
  tier: 'free' | 'pro' | 'enterprise'
  config: TenantConfig
}

export type PlanTier = 'free' | 'pro' | 'enterprise'

export type ResourceScope = 'org' | 'user'

// ─── Skills ──────────────────────────────────────────────────────────────────
// Skill content types now come from @mastra/core/workspace (Skill, SkillMetadata).
// These legacy types are kept for backward compatibility during migration.

export interface SkillMeta {
  id: string
  name: string
  description: string
  triggers: string[]
  examples: Array<{ query: string; action: string }>
  constraints: string[]
  filePath: string
  rawContent: string
  bundledFiles: Record<string, string>
}

/** @deprecated Use SkillPreference from services/skillsService instead */
export interface SkillSearchResult {
  skill: SkillMeta
  score: number
}

// ─── Memory ──────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string
  userId: string
  content: string
  category?: string
  score?: number
  createdAt: string
  updatedAt?: string
}

// ─── Routing ─────────────────────────────────────────────────────────────────

export type RouteTarget =
  | 'orchestrator'
  | 'email'
  | 'research'
  | 'linkedin'
  | 'content'
  | 'calendar'
  | 'browser'
  | 'instagram'
  | 'slack'
  | 'notion'
  | 'crm'
  | 'project'
  | 'messaging'
  | 'docs'
  | 'realEstate'
  | 'finance'
  | 'marketing'
  | 'metaAds'
  | 'adsScraper'
  | 'adAnalyzer'
  | 'campaignBuilder'
  | 'sdr'

export interface RouteDecision {
  target: RouteTarget
  confidence: number
  reasoning?: string
}

export interface RouteDefinition {
  target: RouteTarget
  description: string
  utterances: string[]
  keywordPatterns: RegExp[]
}

// ─── Chat & Messages ─────────────────────────────────────────────────────────

import type { ChatRole } from '@/constants/chat'

export type { ChatRole }

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatRequest {
  message: string
  userId: string
  tenantId: string
  threadId?: string
  channel?: 'web' | 'telegram'
  /** Per-agent custom instructions keyed by agent id (e.g. "email", "research"). */
  agentInstructions?: Record<string, string>
  /** Skill IDs to force-include in context regardless of vector search relevance. */
  pinnedSkillIds?: string[]
  /** Override model for orchestrator (e.g. "google/gemini-3.1-pro-preview"). Omit for default. */
  model?: string
}

export interface ChatResponse {
  text: string
  threadId: string
  memories?: string[]
}

// ─── Integrations ────────────────────────────────────────────────────────────

export type IntegrationProvider =
  | 'gmail'
  | 'google-calendar'
  | 'slack'
  | 'linkedin'
  | 'instagram'
  | 'notion'
  | 'hubspot'
  | 'salesforce'
  | 'zoho-crm'
  | 'pipedrive'
  | 'asana'
  | 'monday'
  | 'microsoft-teams'
  | 'discord'
  | 'google-docs'
  | 'google-sheet'
  | 'airtable'
  | 'calendly'
  | 'stripe'
  | 'quickbooks'
  | 'mailchimp'
  | 'apollo'
  | 'outlook'
  | 'tiktok'
  | 'metaAds'
  | 'searchApi'
  | 'whatsapp'
  | 'follow-up-boss'
  | 'lemlist'
  | 'retellai'
  | 'sms-alert'
  | 'callingly'

export type UnipileProvider = 'linkedin' | 'whatsapp'

/** Composio-backed providers. LinkedIn/WhatsApp are handled via Unipile. */
export type ComposioProvider = Exclude<IntegrationProvider, UnipileProvider>

export type IntegrationBackend = 'composio' | 'unipile'

export interface UserIntegration {
  id: string
  userId: string
  tenantId: string
  provider: IntegrationProvider
  connectionId: string
  status: 'active' | 'needs_reconnect'
  connectedAt: Date
}

// ─── Email ────────────────────────────────────────────────────────────────────

export interface EmailMessage {
  id: string
  subject: string
  from: string
  to: string[]
  body: string
  snippet: string
  date: string
  threadId: string
  isRead: boolean
}

export interface SendEmailParams {
  to: string
  subject: string
  body: string
  replyToThreadId?: string
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  attendees?: string[]
  location?: string
  meetingLink?: string
}

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

export interface LinkedInProfile {
  url: string
  name: string
  headline?: string
  recentActivity?: string
}

export interface LinkedInDMParams {
  clerkUserId: string
  profileUrl: string
  message: string
}

// ─── Morning Brief ───────────────────────────────────────────────────────────

export interface MorningBriefContext {
  date: string
  calendarEvents: CalendarEvent[]
  unreadEmails: EmailMessage[]
  topMemories: string[]
  previousBriefSummary?: string
}

export interface MorningBrief {
  greeting: string
  topPriority: string
  schedule: string
  actionItems: string[]
  generatedAt: string
}

// ─── Threads ─────────────────────────────────────────────────────────────────

export interface ThreadRecord {
  id: string
  userId: string
  tenantId: string
  title: string
  createdAt: number
  updatedAt: number
}

// ─── Context Docs ────────────────────────────────────────────────────────────

export type ContextDocCategory = 'business-info' | 'preferences' | 'reference-docs' | 'custom'

export interface ContextDocRecord {
  id: string
  tenantId: string
  userId: string
  scope: ResourceScope
  title: string
  content: string
  category: ContextDocCategory
  createdAt: number
  updatedAt: number
}

export interface ContextSearchResult {
  docId: string
  title: string
  content: string
  category: string
  score: number
}

// ─── Billing & Credits ───────────────────────────────────────────────────────

export type CreditTxType = 'debit' | 'credit'

export type CreditAction =
  | 'chat_message'
  | 'tool_execution'
  | 'trial_grant'
  | 'purchase'
  | 'admin_grant'
  | 'trial_expired'

export interface TenantBillingRecord {
  id: string
  tenantId: string
  creditBalance: number
  trialStartedAt?: number
  trialEndsAt?: number
  createdAt: number
  updatedAt: number
}

export interface CreditTransactionRecord {
  id: string
  tenantId: string
  userId?: string
  type: CreditTxType
  amount: number
  action: CreditAction
  description: string
  balanceAfter: number
  createdAt: number
}

export interface TrialStatus {
  isOnTrial: boolean
  daysRemaining: number
  trialExpired: boolean
}

export interface CreditCheckResult {
  hasCredits: boolean
  balance: number
  isOnTrial: boolean
  daysRemaining: number
}

// ─── DB Schema types ──────────────────────────────────────────────────────────

export interface TenantRecord {
  id: string
  clerkOrgId: string
  name: string
  tier: PlanTier
  createdAt: Date
}

export interface UserRecord {
  id: string
  clerkUserId: string
  tenantId: string
  telegramId?: string
  email: string
  role: 'owner' | 'member'
  createdAt: Date
}

export interface TenantSkillRecord {
  id: string
  tenantId: string
  userId?: string
  scope: ResourceScope
  skillName: string
  isEnabled: boolean
  isPinned: boolean
  createdAt: Date
  /** @deprecated Kept for migration compat */
  name?: string
  /** @deprecated Kept for migration compat */
  description?: string
  /** @deprecated Kept for migration compat */
  systemPrompt?: string
}

// ─── Prospects ───────────────────────────────────────────────────────────────

export type ProspectStatus =
  | 'new'
  | 'researching'
  | 'draft_ready'
  | 'approved'
  | 'sent'
  | 'replied'
  | 'archived'

export type ProspectSource =
  | 'manual'
  | 'linkedin_search'
  | 'crm_import'
  | 'csv_import'
  | 'exa_webset'
  | 'marketing_chat'

export type OutreachChannel = 'linkedin' | 'email' | 'outlook' | 'instagram'

export type DraftStatus = 'pending_review' | 'approved' | 'rejected' | 'sent' | 'failed'

export type CustomFieldType = 'text' | 'number' | 'select' | 'date' | 'url' | 'boolean'

export interface ProspectRecord {
  id: string
  tenantId: string
  ownerId?: string
  name: string
  firstName?: string
  lastName?: string
  company?: string
  email?: string
  phone?: string
  linkedinUrl?: string
  websiteUrl?: string
  status: ProspectStatus
  stage: ProspectStage
  source: ProspectSource
  notes?: string
  customFields?: Record<string, unknown>
  leadScore?: number
  scoreUpdatedAt?: number
  scoreBreakdown?: Record<string, unknown>
  scoreModelVersion?: string
  createdAt: number
  updatedAt: number
}

export interface ProspectFieldDefinition {
  id: string
  tenantId: string
  name: string
  label: string
  fieldType: CustomFieldType
  options?: string[]
  isRequired?: boolean
  sortOrder: number
  createdAt: number
}

export interface ResearchSnapshot {
  id: string
  prospectId: string
  tenantId: string
  linkedinProfile?: {
    headline?: string
    recentActivity?: string
    connectionDegree?: string
  }
  companyInfo?: {
    summary?: string
    sourceUrl?: string
  }
  newsArticles?: Array<{
    title: string
    url: string
    snippet: string
  }>
  personalizationAngles?: string[]
  researchedAt: number
}

export interface OutreachDraft {
  id: string
  prospectId: string
  tenantId: string
  channel: OutreachChannel
  subject?: string
  body: string
  status: DraftStatus
  sentAt?: number
  sendError?: string
  crmSynced?: boolean
  createdAt: number
  updatedAt: number
}

// ─── Apify LinkedIn ──────────────────────────────────────────────────────────

export interface ApifyLinkedInProfile {
  name?: string
  headline?: string
  about?: string
  location?: string
  profileUrl: string
  experience?: Array<{
    title: string
    company: string
    duration: string
  }>
  education?: Array<{
    school: string
    degree: string
  }>
  skills?: string[]
}

export interface ApifyLinkedInPost {
  text: string
  date?: string
  reactions: number
  comments: number
  url?: string
}

// ─── Tool Result Envelope ────────────────────────────────────────────────────
//
// Canonical return shape for every sub-agent tool and internal MCP primitive.
// Using a discriminated union means the orchestrator never has to guess whether
// a result succeeded; it can dispatch on `.ok` and read `data` / `error`.
// Large payloads must set `artifactId` and keep `data` tight, so model context
// never bloats from raw prospect lists, webset items, or ads briefs.

/**
 * Stable error codes used across tool implementations. Keep additions
 * explicit so prompts and UI can respond to known cases (e.g. prompting the
 * user to connect an integration when `NOT_CONNECTED` is returned).
 */
export type ToolErrorCode =
  | 'NOT_CONNECTED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TIMEOUT'
  | 'PROVIDER_ERROR'
  | 'INTERNAL'
  | 'CANCELLED'

export interface ToolError {
  code: ToolErrorCode | (string & {})
  message: string
  /** True when the caller may safely retry (network blip, rate limit). */
  retryable?: boolean
  /** Optional structured extras (provider status, field, etc.). */
  details?: Record<string, unknown>
}

export type ToolResultOk<T> = {
  ok: true
  data: T
  /** Short LLM-facing summary (one paragraph max). */
  summary?: string
  /** Convex artifactId when data was persisted instead of inlined. */
  artifactId?: string
  /** Full artifact reference when kind/title/summary add discoverability. */
  artifact?: ArtifactRef
}

export type ToolResultErr = { ok: false; error: ToolError }

export type ToolResult<T> = ToolResultOk<T> | ToolResultErr

/** Helper: shape of an artifact reference returned in place of inline data. */
export interface ArtifactRef {
  artifactId: string
  kind: string
  title?: string
  summary?: string
}

// ─── Prospect Stages ─────────────────────────────────────────────────────────

export type ProspectStage =
  | 'new'
  | 'messaged'
  | 'follow_up'
  | 'meeting_booked'
  | 'interested'
  | 'dead'
  | 'deal_open'
