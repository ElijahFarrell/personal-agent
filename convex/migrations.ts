import { mutation } from './_generated/server'
import { SCOPE, TABLES } from './constants'

const DEFAULT_FEATURES = {
  videoStudio: false,
  unifiedInbox: false,
  eventTriggers: false,
} as const

const DEFAULT_LIMITS = {
  maxVideoGenerationsPerMonth: 20,
  maxInboxSyncPerDay: 50,
} as const

/**
 * One-time migration: backfills the `scope` field on existing tenantSkills and
 * contextDocs records that were created before the org/user scope split.
 * Sets all existing records to `scope: 'org'` (organization-level).
 *
 * Safe to run multiple times — skips records that already have a scope.
 *
 * Call via: `npx convex run migrations:backfillScope`
 */
export const backfillScope = mutation({
  args: {},
  handler: async (ctx) => {
    let skillsPatched = 0
    let docsPatched = 0

    const allSkills = await ctx.db.query(TABLES.TENANT_SKILLS).collect()
    for (const skill of allSkills) {
      if (!skill.scope) {
        await ctx.db.patch(skill._id, { scope: SCOPE.ORG })
        skillsPatched++
      }
    }

    const allDocs = await ctx.db.query(TABLES.CONTEXT_DOCS).collect()
    for (const doc of allDocs) {
      if (!doc.scope) {
        await ctx.db.patch(doc._id, { scope: SCOPE.ORG })
        docsPatched++
      }
    }

    return {
      skillsPatched,
      docsPatched,
      message: `Backfilled ${skillsPatched} skills and ${docsPatched} context docs with scope='org'`,
    }
  },
})

/**
 * Backfill new tenantConfigs feature flags and limits for existing orgs.
 * Safe to run multiple times.
 *
 * `npx convex run migrations:backfillTenantConfigFeatures2026`
 */
export const backfillTenantConfigFeatures2026 = mutation({
  args: {},
  handler: async (ctx) => {
    let patched = 0
    const configs = await ctx.db.query(TABLES.TENANT_CONFIGS).collect()
    for (const c of configs) {
      const f = c.features as Record<string, boolean>
      const l = c.limits as Record<string, number>
      const needsPatch =
        f.videoStudio === undefined ||
        f.unifiedInbox === undefined ||
        f.eventTriggers === undefined ||
        l.maxVideoGenerationsPerMonth === undefined ||
        l.maxInboxSyncPerDay === undefined
      if (!needsPatch) continue

      await ctx.db.patch(c._id, {
        features: {
          customWorkflows: f.customWorkflows,
          deepResearch: f.deepResearch,
          outreachCampaigns: f.outreachCampaigns,
          prospectTable: f.prospectTable,
          exaWebsets: f.exaWebsets,
          crmSync: f.crmSync,
          customSkills: f.customSkills,
          voiceMode: f.voiceMode,
          workflowBuilder: f.workflowBuilder,
          scheduledTasks: f.scheduledTasks,
          videoStudio: f.videoStudio ?? DEFAULT_FEATURES.videoStudio,
          unifiedInbox: f.unifiedInbox ?? DEFAULT_FEATURES.unifiedInbox,
          eventTriggers: f.eventTriggers ?? DEFAULT_FEATURES.eventTriggers,
        },
        limits: {
          maxMembers: l.maxMembers,
          maxProspectsPerMonth: l.maxProspectsPerMonth,
          maxWorkflows: l.maxWorkflows,
          maxSchedules: l.maxSchedules,
          maxSkills: l.maxSkills,
          monthlyCredits: l.monthlyCredits,
          maxVideoGenerationsPerMonth:
            l.maxVideoGenerationsPerMonth ?? DEFAULT_LIMITS.maxVideoGenerationsPerMonth,
          maxInboxSyncPerDay: l.maxInboxSyncPerDay ?? DEFAULT_LIMITS.maxInboxSyncPerDay,
        },
      })
      patched++
    }
    return { patched, message: `Updated ${patched} tenant config rows` }
  },
})
