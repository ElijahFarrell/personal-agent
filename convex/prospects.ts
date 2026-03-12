import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  CUSTOM_FIELD_TYPE,
  DRAFT_STATUS,
  INDEXES,
  OUTREACH_CHANNEL,
  PROSPECT_SOURCE,
  PROSPECT_STAGE,
  PROSPECT_STATUS,
  TABLES,
} from './constants'

// ─── Validators ──────────────────────────────────────────────────────────────

const statusValidator = v.union(
  v.literal(PROSPECT_STATUS.NEW),
  v.literal(PROSPECT_STATUS.RESEARCHING),
  v.literal(PROSPECT_STATUS.DRAFT_READY),
  v.literal(PROSPECT_STATUS.APPROVED),
  v.literal(PROSPECT_STATUS.SENT),
  v.literal(PROSPECT_STATUS.REPLIED),
  v.literal(PROSPECT_STATUS.ARCHIVED)
)

const stageValidator = v.union(
  v.literal(PROSPECT_STAGE.NEW),
  v.literal(PROSPECT_STAGE.MESSAGED),
  v.literal(PROSPECT_STAGE.FOLLOW_UP),
  v.literal(PROSPECT_STAGE.MEETING_BOOKED),
  v.literal(PROSPECT_STAGE.INTERESTED),
  v.literal(PROSPECT_STAGE.DEAD),
  v.literal(PROSPECT_STAGE.DEAL_OPEN)
)

const sourceValidator = v.union(
  v.literal(PROSPECT_SOURCE.MANUAL),
  v.literal(PROSPECT_SOURCE.LINKEDIN_SEARCH),
  v.literal(PROSPECT_SOURCE.CRM_IMPORT),
  v.literal(PROSPECT_SOURCE.CSV_IMPORT),
  v.literal(PROSPECT_SOURCE.EXA_WEBSET)
)

const channelValidator = v.union(
  v.literal(OUTREACH_CHANNEL.LINKEDIN),
  v.literal(OUTREACH_CHANNEL.EMAIL),
  v.literal(OUTREACH_CHANNEL.INSTAGRAM)
)

const draftStatusValidator = v.union(
  v.literal(DRAFT_STATUS.PENDING_REVIEW),
  v.literal(DRAFT_STATUS.APPROVED),
  v.literal(DRAFT_STATUS.REJECTED),
  v.literal(DRAFT_STATUS.SENT),
  v.literal(DRAFT_STATUS.FAILED)
)

const fieldTypeValidator = v.union(
  v.literal(CUSTOM_FIELD_TYPE.TEXT),
  v.literal(CUSTOM_FIELD_TYPE.NUMBER),
  v.literal(CUSTOM_FIELD_TYPE.SELECT),
  v.literal(CUSTOM_FIELD_TYPE.DATE),
  v.literal(CUSTOM_FIELD_TYPE.URL),
  v.literal(CUSTOM_FIELD_TYPE.BOOLEAN)
)

// ─── Prospect Mutations ──────────────────────────────────────────────────────

const importRowValidator = v.object({
  name: v.string(),
  company: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  notes: v.optional(v.string()),
})

const exaImportRowValidator = v.object({
  companyName: v.string(),
  email: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  domain: v.optional(v.string()),
})

export const importFromExa = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    ownerId: v.optional(v.id(TABLES.USERS)),
    rows: v.array(exaImportRowValidator),
  },
  handler: async (ctx, { rows, tenantId, ownerId }) => {
    const now = Date.now()
    for (const row of rows) {
      const websiteUrl = row.domain
        ? (row.domain.startsWith('http') ? row.domain : `https://${row.domain}`)
        : undefined
      await ctx.db.insert(TABLES.PROSPECTS, {
        tenantId,
        ownerId,
        name: row.companyName,
        company: row.companyName,
        email: row.email,
        linkedinUrl: row.linkedinUrl,
        websiteUrl,
        status: PROSPECT_STATUS.NEW,
        stage: PROSPECT_STAGE.NEW,
        source: PROSPECT_SOURCE.EXA_WEBSET,
        createdAt: now,
        updatedAt: now,
      })
    }
    return rows.length
  },
})

export const importProspects = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    ownerId: v.optional(v.id(TABLES.USERS)),
    rows: v.array(importRowValidator),
  },
  handler: async (ctx, { rows, tenantId, ownerId }) => {
    const now = Date.now()
    for (const row of rows) {
      await ctx.db.insert(TABLES.PROSPECTS, {
        tenantId,
        ownerId,
        ...row,
        status: PROSPECT_STATUS.NEW,
        stage: PROSPECT_STAGE.NEW,
        source: PROSPECT_SOURCE.CSV_IMPORT,
        createdAt: now,
        updatedAt: now,
      })
    }
    return rows.length
  },
})

export const createProspect = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    ownerId: v.optional(v.id(TABLES.USERS)),
    name: v.string(),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    source: sourceValidator,
    stage: v.optional(stageValidator),
    notes: v.optional(v.string()),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const { stage, ...rest } = args
    return await ctx.db.insert(TABLES.PROSPECTS, {
      ...rest,
      status: PROSPECT_STATUS.NEW,
      stage: stage ?? PROSPECT_STAGE.NEW,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateProspect = mutation({
  args: {
    prospectId: v.id(TABLES.PROSPECTS),
    ownerId: v.optional(v.id(TABLES.USERS)),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    status: v.optional(statusValidator),
    stage: v.optional(stageValidator),
    notes: v.optional(v.string()),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, { prospectId, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )
    await ctx.db.patch(prospectId, { ...filtered, updatedAt: Date.now() })
  },
})

export const deleteProspect = mutation({
  args: { prospectId: v.id(TABLES.PROSPECTS) },
  handler: async (ctx, { prospectId }) => {
    const [snapshots, drafts] = await Promise.all([
      ctx.db
        .query(TABLES.PROSPECT_RESEARCH_SNAPSHOTS)
        .withIndex(INDEXES.BY_PROSPECT_ID, (q) => q.eq('prospectId', prospectId))
        .collect(),
      ctx.db
        .query(TABLES.OUTREACH_DRAFTS)
        .withIndex(INDEXES.BY_PROSPECT_ID, (q) => q.eq('prospectId', prospectId))
        .collect(),
    ])
    await Promise.all([
      ...snapshots.map((s) => ctx.db.delete(s._id)),
      ...drafts.map((d) => ctx.db.delete(d._id)),
      ctx.db.delete(prospectId),
    ])
  },
})

// ─── Prospect Queries ────────────────────────────────────────────────────────

export const getProspectsByTenantId = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.PROSPECTS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .order('desc')
      .collect()
  },
})

export const getProspectsByStatus = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    status: statusValidator,
  },
  handler: async (ctx, { tenantId, status }) => {
    return await ctx.db
      .query(TABLES.PROSPECTS)
      .withIndex(INDEXES.BY_TENANT_STATUS, (q) =>
        q.eq('tenantId', tenantId).eq('status', status)
      )
      .order('desc')
      .collect()
  },
})

export const getProspect = query({
  args: { prospectId: v.id(TABLES.PROSPECTS) },
  handler: async (ctx, { prospectId }) => {
    return await ctx.db.get(prospectId)
  },
})

export const getProspectsByStage = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    stage: stageValidator,
  },
  handler: async (ctx, { tenantId, stage }) => {
    return await ctx.db
      .query(TABLES.PROSPECTS)
      .withIndex(INDEXES.BY_TENANT_STAGE, (q) =>
        q.eq('tenantId', tenantId).eq('stage', stage)
      )
      .order('desc')
      .collect()
  },
})

export const getProspectsByOwner = query({
  args: {
    ownerId: v.id(TABLES.USERS),
  },
  handler: async (ctx, { ownerId }) => {
    return await ctx.db
      .query(TABLES.PROSPECTS)
      .withIndex(INDEXES.BY_OWNER_ID, (q) => q.eq('ownerId', ownerId))
      .order('desc')
      .collect()
  },
})

// ─── Research Snapshot Mutations ─────────────────────────────────────────────

export const upsertResearchSnapshot = mutation({
  args: {
    prospectId: v.id(TABLES.PROSPECTS),
    tenantId: v.id(TABLES.TENANTS),
    linkedinProfile: v.optional(
      v.object({
        headline: v.optional(v.string()),
        recentActivity: v.optional(v.string()),
        connectionDegree: v.optional(v.string()),
      })
    ),
    companyInfo: v.optional(
      v.object({
        summary: v.optional(v.string()),
        sourceUrl: v.optional(v.string()),
      })
    ),
    newsArticles: v.optional(
      v.array(
        v.object({
          title: v.string(),
          url: v.string(),
          snippet: v.string(),
        })
      )
    ),
    personalizationAngles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { prospectId, tenantId, ...data }) => {
    const existing = await ctx.db
      .query(TABLES.PROSPECT_RESEARCH_SNAPSHOTS)
      .withIndex(INDEXES.BY_PROSPECT_ID, (q) => q.eq('prospectId', prospectId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { ...data, researchedAt: Date.now() })
      return existing._id
    }

    return await ctx.db.insert(TABLES.PROSPECT_RESEARCH_SNAPSHOTS, {
      prospectId,
      tenantId,
      ...data,
      researchedAt: Date.now(),
    })
  },
})

export const getResearchSnapshot = query({
  args: { prospectId: v.id(TABLES.PROSPECTS) },
  handler: async (ctx, { prospectId }) => {
    return await ctx.db
      .query(TABLES.PROSPECT_RESEARCH_SNAPSHOTS)
      .withIndex(INDEXES.BY_PROSPECT_ID, (q) => q.eq('prospectId', prospectId))
      .first()
  },
})

// ─── Outreach Draft Mutations ────────────────────────────────────────────────

export const createDraft = mutation({
  args: {
    prospectId: v.id(TABLES.PROSPECTS),
    tenantId: v.id(TABLES.TENANTS),
    channel: channelValidator,
    subject: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert(TABLES.OUTREACH_DRAFTS, {
      ...args,
      status: DRAFT_STATUS.PENDING_REVIEW,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateDraftStatus = mutation({
  args: {
    draftId: v.id(TABLES.OUTREACH_DRAFTS),
    status: v.optional(draftStatusValidator),
    sentAt: v.optional(v.number()),
    sendError: v.optional(v.string()),
    crmSynced: v.optional(v.boolean()),
  },
  handler: async (ctx, { draftId, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    )
    await ctx.db.patch(draftId, { ...filtered, updatedAt: Date.now() })
  },
})

export const updateDraftBody = mutation({
  args: {
    draftId: v.id(TABLES.OUTREACH_DRAFTS),
    body: v.string(),
    subject: v.optional(v.string()),
  },
  handler: async (ctx, { draftId, body, subject }) => {
    const patch: Record<string, unknown> = { body, updatedAt: Date.now() }
    if (subject !== undefined) patch.subject = subject
    await ctx.db.patch(draftId, patch)
  },
})

export const getDraftsByProspect = query({
  args: { prospectId: v.id(TABLES.PROSPECTS) },
  handler: async (ctx, { prospectId }) => {
    return await ctx.db
      .query(TABLES.OUTREACH_DRAFTS)
      .withIndex(INDEXES.BY_PROSPECT_ID, (q) => q.eq('prospectId', prospectId))
      .order('desc')
      .collect()
  },
})

export const getDraft = query({
  args: { draftId: v.id(TABLES.OUTREACH_DRAFTS) },
  handler: async (ctx, { draftId }) => {
    return await ctx.db.get(draftId)
  },
})

// ─── Custom Field Definition Mutations ───────────────────────────────────────

export const createFieldDefinition = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    name: v.string(),
    label: v.string(),
    fieldType: fieldTypeValidator,
    options: v.optional(v.array(v.string())),
    isRequired: v.optional(v.boolean()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert(TABLES.PROSPECT_FIELD_DEFINITIONS, {
      ...args,
      createdAt: Date.now(),
    })
  },
})

export const deleteFieldDefinition = mutation({
  args: { fieldId: v.id(TABLES.PROSPECT_FIELD_DEFINITIONS) },
  handler: async (ctx, { fieldId }) => {
    await ctx.db.delete(fieldId)
  },
})

export const getFieldDefinitions = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.PROSPECT_FIELD_DEFINITIONS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .collect()
  },
})
