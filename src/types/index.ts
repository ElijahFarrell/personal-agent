// ─── Tenant & User ───────────────────────────────────────────────────────────

export interface TenantContext {
  tenantId: string
  userId: string
  userEmail?: string
  tier: 'free' | 'pro' | 'enterprise'
}

export type PlanTier = 'free' | 'pro' | 'enterprise'

export type ResourceScope = 'org' | 'user'

// ─── Skills ──────────────────────────────────────────────────────────────────

export interface SkillMeta {
  id: string
  name: string
  description: string
  triggers: string[]
  examples: Array<{ query: string; action: string }>
  constraints: string[]
  filePath: string
  rawContent: string
  /** Sibling .md files in the skill folder, keyed by filename */
  bundledFiles: Record<string, string>
}

export interface SkillEmbedding {
  skillId: string
  type: 'description' | 'triggers' | 'examples'
  vector: number[]
}

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

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
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
  name: string
  description: string
  systemPrompt: string
  isEnabled: boolean
  createdAt: Date
}
