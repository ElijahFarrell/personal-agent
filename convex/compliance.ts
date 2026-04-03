import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  COMPLIANCE_CHANNEL,
  COMPLIANCE_DECISION,
  CONSENT_KIND,
  INDEXES,
  SUPPRESSION_REASON,
  TABLES,
} from './constants'

const REQUIRED_LEGAL_DOCS = ['terms', 'privacy', 'compliance_agreement'] as const

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

function localHour(nowMs: number, timezone?: string): number | null {
  if (!timezone) return null
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    })
    const parts = formatter.formatToParts(new Date(nowMs))
    const hourRaw = parts.find((p) => p.type === 'hour')?.value
    if (!hourRaw) return null
    const parsed = Number.parseInt(hourRaw, 10)
    return Number.isNaN(parsed) ? null : parsed
  } catch {
    return null
  }
}

function isWithinAllowedWindow(hour: number, start: number, end: number): boolean {
  if (start === end) return true
  if (start < end) return hour >= start && hour < end
  return hour >= start || hour < end
}

export const getLegalAcceptanceStatus = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    requiredVersion: v.string(),
  },
  handler: async (ctx, { tenantId, userId, requiredVersion }) => {
    const all = await ctx.db
      .query(TABLES.LEGAL_ACCEPTANCES)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .collect()
    const mine = all.filter((row) => row.userId === userId && row.version === requiredVersion)
    const acceptedKeys = new Set(mine.map((row) => row.documentKey))
    const missing = REQUIRED_LEGAL_DOCS.filter((key) => !acceptedKeys.has(key))
    return {
      requiredVersion,
      accepted: missing.length === 0,
      missing,
    }
  },
})

export const recordLegalAcceptance = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
    version: v.string(),
    acceptedDocs: v.array(
      v.union(
        v.literal('terms'),
        v.literal('privacy'),
        v.literal('compliance_agreement')
      )
    ),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    for (const doc of args.acceptedDocs) {
      const existing = await ctx.db
        .query(TABLES.LEGAL_ACCEPTANCES)
        .withIndex(INDEXES.BY_TENANT_USER_DOC_VERSION, (q) =>
          q
            .eq('tenantId', args.tenantId)
            .eq('userId', args.userId)
            .eq('documentKey', doc)
            .eq('version', args.version)
        )
        .first()
      if (existing) continue
      await ctx.db.insert(TABLES.LEGAL_ACCEPTANCES, {
        tenantId: args.tenantId,
        userId: args.userId,
        documentKey: doc,
        version: args.version,
        acceptedAt: now,
        ipAddress: args.ipAddress,
        userAgent: args.userAgent,
      })
    }
    return { ok: true }
  },
})

export const upsertSuppressionEntry = mutation({
  args: {
    webhookSecret: v.string(),
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
    source: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const expected = process.env.INTERNAL_WEBHOOK_SECRET
    if (!expected || args.webhookSecret !== expected) {
      throw new Error('Unauthorized')
    }
    const phone = normalizePhone(args.phone)
    const existing = await ctx.db
      .query(TABLES.SUPPRESSION_LISTS)
      .withIndex(INDEXES.BY_TENANT_CHANNEL_PHONE, (q) =>
        q.eq('tenantId', args.tenantId).eq('channel', args.channel).eq('phone', phone)
      )
      .first()
    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        active: args.active,
        reason: args.reason,
        source: args.source,
        updatedAt: now,
      })
      return existing._id
    }
    return await ctx.db.insert(TABLES.SUPPRESSION_LISTS, {
      tenantId: args.tenantId,
      phone,
      channel: args.channel,
      reason: args.reason,
      source: args.source,
      active: args.active,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const logAuditEvent = mutation({
  args: {
    webhookSecret: v.string(),
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
  },
  handler: async (ctx, args) => {
    const expected = process.env.INTERNAL_WEBHOOK_SECRET
    if (!expected || args.webhookSecret !== expected) {
      throw new Error('Unauthorized')
    }
    return await ctx.db.insert(TABLES.COMPLIANCE_AUDIT_EVENTS, {
      ...args,
      phone: normalizePhone(args.phone),
      createdAt: Date.now(),
    })
  },
})

export const checkOutboundPreflight = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    channel: v.union(
      v.literal(COMPLIANCE_CHANNEL.VOICE_CALL),
      v.literal(COMPLIANCE_CHANNEL.SMS),
      v.literal(COMPLIANCE_CHANNEL.EMAIL)
    ),
    phone: v.string(),
    timezone: v.optional(v.string()),
    stateCode: v.optional(v.string()),
    nowMs: v.number(),
    requireConsentForVoice: v.optional(v.boolean()),
    forceDisclosure: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const reasonCodes: string[] = []
    const phone = normalizePhone(args.phone)
    const timezone = args.timezone
    const stateCode = args.stateCode?.toUpperCase()
    const policyVersion = '2026.04.02'

    const suppressions = await ctx.db
      .query(TABLES.SUPPRESSION_LISTS)
      .withIndex(INDEXES.BY_TENANT_PHONE, (q) =>
        q.eq('tenantId', args.tenantId).eq('phone', phone)
      )
      .collect()
    const blockedBySuppression = suppressions.some(
      (row) => row.active && (row.channel === args.channel || row.channel === COMPLIANCE_CHANNEL.SMS)
    )
    if (blockedBySuppression) {
      reasonCodes.push('SUPPRESSED')
    }

    const dncEntries = await ctx.db
      .query(TABLES.DNC_ENTRIES)
      .withIndex(INDEXES.BY_TENANT_PHONE, (q) =>
        q.eq('tenantId', args.tenantId).eq('phone', phone)
      )
      .collect()
    const activeDnc = dncEntries.some((entry) => {
      if (!entry.active) return false
      if (entry.expiresAt !== undefined && entry.expiresAt < args.nowMs) return false
      if (entry.scope === 'state' && stateCode && entry.stateCode && entry.stateCode !== stateCode) {
        return false
      }
      return true
    })
    if (activeDnc) {
      reasonCodes.push('DNC_MATCH')
    }

    const hour = localHour(args.nowMs, timezone)
    if (hour !== null) {
      const statePolicy = stateCode
        ? await ctx.db
            .query(TABLES.COMPLIANCE_POLICIES)
            .withIndex(INDEXES.BY_TENANT_STATE, (q) =>
              q.eq('tenantId', args.tenantId).eq('stateCode', stateCode)
            )
            .first()
        : null
      const start = statePolicy?.quietHoursStart ?? 8
      const end = statePolicy?.quietHoursEnd ?? 21
      if (!isWithinAllowedWindow(hour, start, end)) {
        reasonCodes.push('OUTSIDE_CALL_WINDOW')
      }
    }

    const consentRows = await ctx.db
      .query(TABLES.CONSENT_RECORDS)
      .withIndex(INDEXES.BY_TENANT_PHONE, (q) =>
        q.eq('tenantId', args.tenantId).eq('phone', phone)
      )
      .collect()
    const hasSmsConsent = consentRows.some(
      (row) => row.kind === CONSENT_KIND.SMS && row.revokedAt === undefined
    )
    const hasVoiceConsent = consentRows.some(
      (row) => row.kind === CONSENT_KIND.VOICE && row.revokedAt === undefined
    )

    if (args.channel === COMPLIANCE_CHANNEL.SMS && !hasSmsConsent) {
      reasonCodes.push('MISSING_SMS_CONSENT')
    }
    if (
      args.channel === COMPLIANCE_CHANNEL.VOICE_CALL &&
      args.requireConsentForVoice === true &&
      !hasVoiceConsent
    ) {
      reasonCodes.push('MISSING_VOICE_CONSENT')
    }

    const disclosureRequired = args.channel === COMPLIANCE_CHANNEL.VOICE_CALL
      ? args.forceDisclosure !== false
      : false
    const optOutRequired =
      args.channel === COMPLIANCE_CHANNEL.SMS ||
      args.channel === COMPLIANCE_CHANNEL.VOICE_CALL

    const decision =
      reasonCodes.length > 0 ? COMPLIANCE_DECISION.BLOCK : COMPLIANCE_DECISION.ALLOW
    return {
      policyVersion,
      decision,
      allowed: decision === COMPLIANCE_DECISION.ALLOW,
      reasonCodes,
      disclosureRequired,
      optOutRequired,
      normalizedPhone: phone,
      timezone,
      stateCode,
    }
  },
})

export const listAuditEvents = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 100 }) => {
    return await ctx.db
      .query(TABLES.COMPLIANCE_AUDIT_EVENTS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(limit)
  },
})

export const getTenantComplianceHealth = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    nowMs: v.number(),
  },
  handler: async (ctx, { tenantId, nowMs }) => {
    const all = await ctx.db
      .query(TABLES.COMPLIANCE_AUDIT_EVENTS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .take(200)
    const cutoff = nowMs - 24 * 60 * 60 * 1000
    const blocked24h = all.filter(
      (row) => row.createdAt >= cutoff && row.decision === COMPLIANCE_DECISION.BLOCK
    ).length
    return {
      blocked24h,
      suspended: blocked24h >= 10,
    }
  },
})
