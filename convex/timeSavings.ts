import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { query } from './_generated/server'
import {
  ADS_PIPELINE_RUN_STATUS,
  DRAFT_STATUS,
  INDEXES,
  PROSPECT_STAGE,
  TABLES,
} from './constants'

/** Niche defaults (minutes). Real estate assumes more manual comp / listing research. */
const DEFAULTS_GENERIC = {
  researchMinutesPerProspectSnapshot: 40,
  researchMinutesPerAdsRun: 60,
  minutesPerOutreachSend: 8,
  minutesPerInboxReply: 5,
  minutesPerPersonalizedOutreach: 12,
} as const

const DEFAULTS_REAL_ESTATE = {
  researchMinutesPerProspectSnapshot: 55,
  researchMinutesPerAdsRun: 75,
  minutesPerOutreachSend: 10,
  minutesPerInboxReply: 6,
  minutesPerPersonalizedOutreach: 15,
} as const

type MetricAssumptionsResolved = {
  researchMinutesPerProspectSnapshot: number
  researchMinutesPerAdsRun: number
  minutesPerOutreachSend: number
  minutesPerInboxReply: number
  minutesPerPersonalizedOutreach: number
}

function resolveAssumptions(
  nicheId: 'generic' | 'real_estate' | undefined,
  override:
    | {
        researchMinutesPerProspectSnapshot?: number
        researchMinutesPerAdsRun?: number
        minutesPerOutreachSend?: number
        minutesPerInboxReply?: number
        minutesPerPersonalizedOutreach?: number
      }
    | undefined
): MetricAssumptionsResolved {
  const base: MetricAssumptionsResolved =
    nicheId === 'real_estate'
      ? { ...DEFAULTS_REAL_ESTATE }
      : { ...DEFAULTS_GENERIC }
  if (!override) return base
  const keys = Object.keys(base) as (keyof MetricAssumptionsResolved)[]
  for (const k of keys) {
    const o = override[k]
    if (typeof o === 'number' && Number.isFinite(o) && o >= 0) {
      base[k] = o
    }
  }
  return base
}

function dayUtc(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function emptyDayBuckets(
  startTs: number,
  endTs: number
): Map<string, { research: number; ads: number; outreach: number; inbox: number }> {
  const map = new Map<
    string,
    { research: number; ads: number; outreach: number; inbox: number }
  >()
  const start = new Date(startTs)
  start.setUTCHours(0, 0, 0, 0)
  for (let t = start.getTime(); t <= endTs; t += 86400000) {
    map.set(dayUtc(t), { research: 0, ads: 0, outreach: 0, inbox: 0 })
  }
  return map
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
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()

    const nicheId = config?.nicheId ?? 'generic'
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

    let prospectResearchCount = 0
    if (hasProspect) {
      const rows = await ctx.db
        .query(TABLES.PROSPECT_RESEARCH_SNAPSHOTS)
        .withIndex(INDEXES.BY_TENANT_RESEARCHED_AT, (q) =>
          q.eq('tenantId', tenantId).gte('researchedAt', startTs).lte('researchedAt', endTs)
        )
        .collect()
      prospectResearchCount = rows.length
    }

    let adsCompletedCount = 0
    if (hasAds) {
      const rows = await ctx.db
        .query(TABLES.ADS_PIPELINE_RUNS)
        .withIndex(INDEXES.BY_TENANT_COMPLETED_AT, (q) =>
          q.eq('tenantId', tenantId).gte('completedAt', startTs).lte('completedAt', endTs)
        )
        .filter((q) => q.eq(q.field('status'), ADS_PIPELINE_RUN_STATUS.COMPLETED))
        .collect()
      adsCompletedCount = rows.length
    }

    let outreachSent: Doc<'outreachDrafts'>[] = []
    if (hasOutreach) {
      outreachSent = await ctx.db
        .query(TABLES.OUTREACH_DRAFTS)
        .withIndex(INDEXES.BY_TENANT_SENT_AT, (q) =>
          q.eq('tenantId', tenantId).gte('sentAt', startTs).lte('sentAt', endTs)
        )
        .filter((q) => q.eq(q.field('status'), DRAFT_STATUS.SENT))
        .collect()
    }

    let inboxOutboundCount = 0
    if (hasInbox) {
      const rows = await ctx.db
        .query(TABLES.INBOX_OUTBOUND_EVENTS)
        .withIndex(INDEXES.BY_TENANT_INBOX_OUTBOUND_SENT_AT, (q) =>
          q.eq('tenantId', tenantId).gte('sentAt', startTs).lte('sentAt', endTs)
        )
        .collect()
      inboxOutboundCount = rows.length
    }

    let personalizedSendCount = 0
    if (hasOutreach && hasProspect && outreachSent.length > 0) {
      for (const draft of outreachSent) {
        const sentAt = draft.sentAt
        if (sentAt === undefined) continue
        const snaps = await ctx.db
          .query(TABLES.PROSPECT_RESEARCH_SNAPSHOTS)
          .withIndex(INDEXES.BY_PROSPECT_ID, (q) => q.eq('prospectId', draft.prospectId))
          .collect()
        const prior = snaps.some((s) => s.researchedAt < sentAt)
        if (prior) personalizedSendCount += 1
      }
    }

    const hoursProspectResearch =
      (prospectResearchCount * assumptions.researchMinutesPerProspectSnapshot) / 60
    const hoursAds =
      (adsCompletedCount * assumptions.researchMinutesPerAdsRun) / 60
    const hoursOutreach =
      (outreachSent.length * assumptions.minutesPerOutreachSend) / 60
    const hoursInbox =
      (inboxOutboundCount * assumptions.minutesPerInboxReply) / 60
    const hoursPersonalizationExtra =
      (personalizedSendCount * assumptions.minutesPerPersonalizedOutreach) / 60

    const researchHoursTotal = hoursProspectResearch + hoursAds
    const communicationHoursTotal = hoursOutreach + hoursInbox
    const totalEstimatedHours =
      researchHoursTotal + communicationHoursTotal + hoursPersonalizationExtra

    let velocityAvgDays: number | null = null
    let meetingBookedInPeriod = 0
    if (hasProspect) {
      const booked = await ctx.db
        .query(TABLES.PROSPECTS)
        .withIndex(INDEXES.BY_TENANT_STAGE, (q) =>
          q.eq('tenantId', tenantId).eq('stage', PROSPECT_STAGE.MEETING_BOOKED)
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
      },
      hours: {
        prospectResearch: hoursProspectResearch,
        adsResearch: hoursAds,
        researchTotal: researchHoursTotal,
        outreach: hoursOutreach,
        inbox: hoursInbox,
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
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .unique()

    const nicheId = config?.nicheId ?? 'generic'
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

    const buckets = emptyDayBuckets(startTs, endTs)

    if (hasProspect) {
      const rows = await ctx.db
        .query(TABLES.PROSPECT_RESEARCH_SNAPSHOTS)
        .withIndex(INDEXES.BY_TENANT_RESEARCHED_AT, (q) =>
          q.eq('tenantId', tenantId).gte('researchedAt', startTs).lte('researchedAt', endTs)
        )
        .collect()
      for (const r of rows) {
        const d = dayUtc(r.researchedAt)
        const b = buckets.get(d)
        if (b) b.research += 1
      }
    }

    if (hasAds) {
      const rows = await ctx.db
        .query(TABLES.ADS_PIPELINE_RUNS)
        .withIndex(INDEXES.BY_TENANT_COMPLETED_AT, (q) =>
          q.eq('tenantId', tenantId).gte('completedAt', startTs).lte('completedAt', endTs)
        )
        .filter((q) => q.eq(q.field('status'), ADS_PIPELINE_RUN_STATUS.COMPLETED))
        .collect()
      for (const r of rows) {
        const t = r.completedAt
        if (t === undefined) continue
        const d = dayUtc(t)
        const b = buckets.get(d)
        if (b) b.ads += 1
      }
    }

    if (hasOutreach) {
      const rows = await ctx.db
        .query(TABLES.OUTREACH_DRAFTS)
        .withIndex(INDEXES.BY_TENANT_SENT_AT, (q) =>
          q.eq('tenantId', tenantId).gte('sentAt', startTs).lte('sentAt', endTs)
        )
        .filter((q) => q.eq(q.field('status'), DRAFT_STATUS.SENT))
        .collect()
      for (const r of rows) {
        const t = r.sentAt
        if (t === undefined) continue
        const d = dayUtc(t)
        const b = buckets.get(d)
        if (b) b.outreach += 1
      }
    }

    if (hasInbox) {
      const rows = await ctx.db
        .query(TABLES.INBOX_OUTBOUND_EVENTS)
        .withIndex(INDEXES.BY_TENANT_INBOX_OUTBOUND_SENT_AT, (q) =>
          q.eq('tenantId', tenantId).gte('sentAt', startTs).lte('sentAt', endTs)
        )
        .collect()
      for (const r of rows) {
        const d = dayUtc(r.sentAt)
        const b = buckets.get(d)
        if (b) b.inbox += 1
      }
    }

    const series = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, c]) => {
        const researchHours =
          (c.research * assumptions.researchMinutesPerProspectSnapshot +
            c.ads * assumptions.researchMinutesPerAdsRun) /
          60
        const commHours =
          (c.outreach * assumptions.minutesPerOutreachSend +
            c.inbox * assumptions.minutesPerInboxReply) /
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
