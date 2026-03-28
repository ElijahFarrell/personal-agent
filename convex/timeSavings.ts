import { v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { query } from "./_generated/server"
import {
  ADS_PIPELINE_RUN_STATUS,
  DRAFT_STATUS,
  INDEXES,
  INBOX_AI_USAGE_KIND,
  MESSAGE_ROLE,
  PROSPECT_STAGE,
  TABLES,
} from "./constants"

/** Niche defaults (minutes). */
const DEFAULTS_GENERIC = {
  researchMinutesPerProspectSnapshot: 25,
  researchMinutesPerAdsRun: 45,
  minutesPerOutreachSend: 8,
  minutesPerInboxReply: 5,
  minutesPerPersonalizedOutreach: 12,
  minutesPerDeepResearchAssistantMessage: 18,
  minutesPerResearchAgentAssistantMessage: 12,
  minutesPerInboxDraftReply: 8,
  minutesPerInboxSummarize: 6,
} as const

const DEFAULTS_REAL_ESTATE = {
  researchMinutesPerProspectSnapshot: 34,
  researchMinutesPerAdsRun: 58,
  minutesPerOutreachSend: 10,
  minutesPerInboxReply: 6,
  minutesPerPersonalizedOutreach: 15,
  minutesPerDeepResearchAssistantMessage: 22,
  minutesPerResearchAgentAssistantMessage: 15,
  minutesPerInboxDraftReply: 10,
  minutesPerInboxSummarize: 8,
} as const

type MetricAssumptionsResolved = {
  researchMinutesPerProspectSnapshot: number
  researchMinutesPerAdsRun: number
  minutesPerOutreachSend: number
  minutesPerInboxReply: number
  minutesPerPersonalizedOutreach: number
  minutesPerDeepResearchAssistantMessage: number
  minutesPerResearchAgentAssistantMessage: number
  minutesPerInboxDraftReply: number
  minutesPerInboxSummarize: number
}

function resolveAssumptions(
  nicheId: "generic" | "real_estate" | undefined,
  override:
    | {
        researchMinutesPerProspectSnapshot?: number
        researchMinutesPerAdsRun?: number
        minutesPerOutreachSend?: number
        minutesPerInboxReply?: number
        minutesPerPersonalizedOutreach?: number
        minutesPerDeepResearchAssistantMessage?: number
        minutesPerResearchAgentAssistantMessage?: number
        minutesPerInboxDraftReply?: number
        minutesPerInboxSummarize?: number
      }
    | undefined
): MetricAssumptionsResolved {
  const base: MetricAssumptionsResolved =
    nicheId === "real_estate"
      ? { ...DEFAULTS_REAL_ESTATE }
      : { ...DEFAULTS_GENERIC }
  if (!override) return base
  const keys = Object.keys(base) as (keyof MetricAssumptionsResolved)[]
  for (const k of keys) {
    const o = override[k]
    if (typeof o === "number" && Number.isFinite(o) && o >= 0) {
      base[k] = o
    }
  }
  return base
}

function dayUtc(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

type DayBucket = {
  prospect: number
  ads: number
  outreach: number
  inboxOutbound: number
  inboxDraft: number
  inboxSummarize: number
  deepResearch: number
  researchAgent: number
}

function emptyDayBuckets(
  startTs: number,
  endTs: number
): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>()
  const start = new Date(startTs)
  start.setUTCHours(0, 0, 0, 0)
  for (let t = start.getTime(); t <= endTs; t += 86400000) {
    map.set(dayUtc(t), {
      prospect: 0,
      ads: 0,
      outreach: 0,
      inboxOutbound: 0,
      inboxDraft: 0,
      inboxSummarize: 0,
      deepResearch: 0,
      researchAgent: 0,
    })
  }
  return map
}

const RESEARCH_AGENT_ID = "research"

function classifyAssistantMessage(
  metadata: Doc<"messages">["metadata"]
): "deepResearch" | "researchAgent" | null {
  if (!metadata) return null
  if (metadata.deepResearch === true) return "deepResearch"
  if (metadata.targetAgent === RESEARCH_AGENT_ID) return "researchAgent"
  return null
}

export const getSummary = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, { tenantId, startTs, endTs }) => {
    const config = await ctx.db
      .query(TABLES.TENANT_CONFIGS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq("tenantId", tenantId))
      .unique()

    const nicheId = config?.nicheId ?? "generic"
    const assumptions = resolveAssumptions(nicheId, config?.metricAssumptions)

    const f = config?.features
    const hasProspect =
      f?.prospectTable === true || config?.fullPlatformAccess === true
    const hasAds =
      f?.deepResearch === true || config?.fullPlatformAccess === true
    const hasOutreach =
      f?.outreachCampaigns === true || config?.fullPlatformAccess === true
    const hasInbox =
      f?.unifiedInbox === true || config?.fullPlatformAccess === true

    const prospectRows = await ctx.db
      .query(TABLES.PROSPECT_RESEARCH_SNAPSHOTS)
      .withIndex(INDEXES.BY_TENANT_RESEARCHED_AT, (q) =>
        q.eq("tenantId", tenantId).gte("researchedAt", startTs).lte("researchedAt", endTs)
      )
      .collect()
    const prospectResearchCount = prospectRows.length

    const adsRows = await ctx.db
      .query(TABLES.ADS_PIPELINE_RUNS)
      .withIndex(INDEXES.BY_TENANT_COMPLETED_AT, (q) =>
        q.eq("tenantId", tenantId).gte("completedAt", startTs).lte("completedAt", endTs)
      )
      .filter((q) => q.eq(q.field("status"), ADS_PIPELINE_RUN_STATUS.COMPLETED))
      .collect()
    const adsCompletedCount = adsRows.length

    const outreachSent = await ctx.db
      .query(TABLES.OUTREACH_DRAFTS)
      .withIndex(INDEXES.BY_TENANT_SENT_AT, (q) =>
        q.eq("tenantId", tenantId).gte("sentAt", startTs).lte("sentAt", endTs)
      )
      .filter((q) => q.eq(q.field("status"), DRAFT_STATUS.SENT))
      .collect()

    const inboxOutboundRows = await ctx.db
      .query(TABLES.INBOX_OUTBOUND_EVENTS)
      .withIndex(INDEXES.BY_TENANT_INBOX_OUTBOUND_SENT_AT, (q) =>
        q.eq("tenantId", tenantId).gte("sentAt", startTs).lte("sentAt", endTs)
      )
      .collect()
    const inboxOutboundCount = inboxOutboundRows.length

    const inboxAiRows = await ctx.db
      .query(TABLES.INBOX_AI_USAGE)
      .withIndex(INDEXES.BY_TENANT_INBOX_AI_CREATED, (q) =>
        q.eq("tenantId", tenantId).gte("createdAt", startTs).lte("createdAt", endTs)
      )
      .collect()
    const inboxDraftCount = inboxAiRows.filter(
      (r) => r.kind === INBOX_AI_USAGE_KIND.DRAFT_REPLY
    ).length
    const inboxSummarizeCount = inboxAiRows.filter(
      (r) => r.kind === INBOX_AI_USAGE_KIND.SUMMARIZE
    ).length

    const assistantMessages = await ctx.db
      .query(TABLES.MESSAGES)
      .withIndex(INDEXES.BY_TENANT_CREATED, (q) =>
        q.eq("tenantId", tenantId).gte("createdAt", startTs).lte("createdAt", endTs)
      )
      .filter((q) => q.eq(q.field("role"), MESSAGE_ROLE.ASSISTANT))
      .collect()

    let deepResearchAssistantCount = 0
    let researchAgentAssistantCount = 0
    for (const m of assistantMessages) {
      const c = classifyAssistantMessage(m.metadata)
      if (c === "deepResearch") deepResearchAssistantCount += 1
      else if (c === "researchAgent") researchAgentAssistantCount += 1
    }

    let personalizedSendCount = 0
    if (outreachSent.length > 0) {
      for (const draft of outreachSent) {
        const sentAt = draft.sentAt
        if (sentAt === undefined) continue
        const snaps = await ctx.db
          .query(TABLES.PROSPECT_RESEARCH_SNAPSHOTS)
          .withIndex(INDEXES.BY_PROSPECT_ID, (q) => q.eq("prospectId", draft.prospectId))
          .collect()
        const prior = snaps.some((s) => s.researchedAt < sentAt)
        if (prior) personalizedSendCount += 1
      }
    }

    const hoursProspectResearch =
      (prospectResearchCount * assumptions.researchMinutesPerProspectSnapshot) / 60
    const hoursAds =
      (adsCompletedCount * assumptions.researchMinutesPerAdsRun) / 60
    const hoursDeepResearch =
      (deepResearchAssistantCount * assumptions.minutesPerDeepResearchAssistantMessage) /
      60
    const hoursResearchAgent =
      (researchAgentAssistantCount * assumptions.minutesPerResearchAgentAssistantMessage) /
      60
    const hoursOutreach =
      (outreachSent.length * assumptions.minutesPerOutreachSend) / 60
    const hoursInbox =
      (inboxOutboundCount * assumptions.minutesPerInboxReply) / 60
    const hoursInboxDraft =
      (inboxDraftCount * assumptions.minutesPerInboxDraftReply) / 60
    const hoursInboxSummarize =
      (inboxSummarizeCount * assumptions.minutesPerInboxSummarize) / 60
    const hoursPersonalizationExtra =
      (personalizedSendCount * assumptions.minutesPerPersonalizedOutreach) / 60

    const researchHoursTotal =
      hoursProspectResearch + hoursAds + hoursDeepResearch + hoursResearchAgent
    const communicationHoursTotal =
      hoursOutreach +
      hoursInbox +
      hoursInboxDraft +
      hoursInboxSummarize +
      hoursPersonalizationExtra

    const totalEstimatedHours = researchHoursTotal + communicationHoursTotal

    let velocityAvgDays: number | null = null
    let meetingBookedInPeriod = 0
    const booked = await ctx.db
      .query(TABLES.PROSPECTS)
      .withIndex(INDEXES.BY_TENANT_STAGE, (q) =>
        q.eq("tenantId", tenantId).eq("stage", PROSPECT_STAGE.MEETING_BOOKED)
      )
      .collect()
    const inWindow = booked.filter(
      (p) => p.updatedAt >= startTs && p.updatedAt <= endTs
    )
    meetingBookedInPeriod = inWindow.length
    if (inWindow.length > 0) {
      const sumDays = inWindow.reduce((acc, p) => {
        const days = (p.updatedAt - p.createdAt) / 86400000
        return acc + Math.max(0, days)
      }, 0)
      velocityAvgDays = sumDays / inWindow.length
    }

    return {
      assumptions,
      flags: {
        hasProspect,
        hasAds,
        hasOutreach,
        hasInbox,
      },
      counts: {
        prospectResearch: prospectResearchCount,
        adsCompleted: adsCompletedCount,
        outreachSent: outreachSent.length,
        inboxOutbound: inboxOutboundCount,
        personalizedSends: personalizedSendCount,
        meetingBookedInPeriod,
        deepResearchAssistantMessages: deepResearchAssistantCount,
        researchAgentAssistantMessages: researchAgentAssistantCount,
        inboxDraftReply: inboxDraftCount,
        inboxSummarize: inboxSummarizeCount,
      },
      hours: {
        prospectResearch: hoursProspectResearch,
        adsResearch: hoursAds,
        deepResearchChat: hoursDeepResearch,
        researchAgent: hoursResearchAgent,
        researchTotal: researchHoursTotal,
        outreach: hoursOutreach,
        inbox: hoursInbox,
        inboxDraftReply: hoursInboxDraft,
        inboxSummarize: hoursInboxSummarize,
        communicationTotal: communicationHoursTotal,
        personalization: hoursPersonalizationExtra,
        totalEstimated: totalEstimatedHours,
      },
      velocityAvgDaysToMeetingBooked: velocityAvgDays,
    }
  },
})

export const getDailySeries = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, { tenantId, startTs, endTs }) => {
    const config = await ctx.db
      .query(TABLES.TENANT_CONFIGS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq("tenantId", tenantId))
      .unique()

    const nicheId = config?.nicheId ?? "generic"
    const assumptions = resolveAssumptions(nicheId, config?.metricAssumptions)

    const buckets = emptyDayBuckets(startTs, endTs)

    const prospectRows = await ctx.db
      .query(TABLES.PROSPECT_RESEARCH_SNAPSHOTS)
      .withIndex(INDEXES.BY_TENANT_RESEARCHED_AT, (q) =>
        q.eq("tenantId", tenantId).gte("researchedAt", startTs).lte("researchedAt", endTs)
      )
      .collect()
    for (const r of prospectRows) {
      const d = dayUtc(r.researchedAt)
      const b = buckets.get(d)
      if (b) b.prospect += 1
    }

    const adsRows = await ctx.db
      .query(TABLES.ADS_PIPELINE_RUNS)
      .withIndex(INDEXES.BY_TENANT_COMPLETED_AT, (q) =>
        q.eq("tenantId", tenantId).gte("completedAt", startTs).lte("completedAt", endTs)
      )
      .filter((q) => q.eq(q.field("status"), ADS_PIPELINE_RUN_STATUS.COMPLETED))
      .collect()
    for (const r of adsRows) {
      const t = r.completedAt
      if (t === undefined) continue
      const d = dayUtc(t)
      const b = buckets.get(d)
      if (b) b.ads += 1
    }

    const outreachRows = await ctx.db
      .query(TABLES.OUTREACH_DRAFTS)
      .withIndex(INDEXES.BY_TENANT_SENT_AT, (q) =>
        q.eq("tenantId", tenantId).gte("sentAt", startTs).lte("sentAt", endTs)
      )
      .filter((q) => q.eq(q.field("status"), DRAFT_STATUS.SENT))
      .collect()
    for (const r of outreachRows) {
      const t = r.sentAt
      if (t === undefined) continue
      const d = dayUtc(t)
      const b = buckets.get(d)
      if (b) b.outreach += 1
    }

    const inboxOutRows = await ctx.db
      .query(TABLES.INBOX_OUTBOUND_EVENTS)
      .withIndex(INDEXES.BY_TENANT_INBOX_OUTBOUND_SENT_AT, (q) =>
        q.eq("tenantId", tenantId).gte("sentAt", startTs).lte("sentAt", endTs)
      )
      .collect()
    for (const r of inboxOutRows) {
      const d = dayUtc(r.sentAt)
      const b = buckets.get(d)
      if (b) b.inboxOutbound += 1
    }

    const inboxAiRows = await ctx.db
      .query(TABLES.INBOX_AI_USAGE)
      .withIndex(INDEXES.BY_TENANT_INBOX_AI_CREATED, (q) =>
        q.eq("tenantId", tenantId).gte("createdAt", startTs).lte("createdAt", endTs)
      )
      .collect()
    for (const r of inboxAiRows) {
      const d = dayUtc(r.createdAt)
      const b = buckets.get(d)
      if (!b) continue
      if (r.kind === INBOX_AI_USAGE_KIND.DRAFT_REPLY) b.inboxDraft += 1
      else b.inboxSummarize += 1
    }

    const assistantMessages = await ctx.db
      .query(TABLES.MESSAGES)
      .withIndex(INDEXES.BY_TENANT_CREATED, (q) =>
        q.eq("tenantId", tenantId).gte("createdAt", startTs).lte("createdAt", endTs)
      )
      .filter((q) => q.eq(q.field("role"), MESSAGE_ROLE.ASSISTANT))
      .collect()
    for (const m of assistantMessages) {
      const d = dayUtc(m.createdAt)
      const b = buckets.get(d)
      if (!b) continue
      const c = classifyAssistantMessage(m.metadata)
      if (c === "deepResearch") b.deepResearch += 1
      else if (c === "researchAgent") b.researchAgent += 1
    }

    const series = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, c]) => {
        const researchHours =
          (c.prospect * assumptions.researchMinutesPerProspectSnapshot +
            c.ads * assumptions.researchMinutesPerAdsRun +
            c.deepResearch * assumptions.minutesPerDeepResearchAssistantMessage +
            c.researchAgent * assumptions.minutesPerResearchAgentAssistantMessage) /
          60
        const commHours =
          (c.outreach * assumptions.minutesPerOutreachSend +
            c.inboxOutbound * assumptions.minutesPerInboxReply +
            c.inboxDraft * assumptions.minutesPerInboxDraftReply +
            c.inboxSummarize * assumptions.minutesPerInboxSummarize) /
          60
        return {
          date,
          researchHours,
          communicationHours: commHours,
          totalHours: researchHours + commHours,
        }
      })

    return { series, assumptions }
  },
})
