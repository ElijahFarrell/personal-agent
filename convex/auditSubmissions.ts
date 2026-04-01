import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { TABLES } from './constants'

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const submittedAt = Date.now()
    const id = await ctx.db.insert(TABLES.AUDIT_SUBMISSIONS, {
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      role: args.role,
      roleOther: args.roleOther?.trim(),
      teamSize: args.teamSize,
      topTasks: args.topTasks.trim(),
      weeklyManualHours: args.weeklyManualHours,
      oneTaskToHandOff: args.oneTaskToHandOff.trim(),
      currentTools: args.currentTools,
      toolsOther: args.toolsOther?.trim(),
      toolFrustration: args.toolFrustration.trim(),
      offToolProcesses: args.offToolProcesses.trim(),
      biggestChallenge: args.biggestChallenge,
      biggestChallengeOther: args.biggestChallengeOther?.trim(),
      aiExperience: args.aiExperience,
      aiWishIn30Days: args.aiWishIn30Days.trim(),
      monthlyLeads: args.monthlyLeads,
      annualRevenue: args.annualRevenue,
      status: 'pending',
      submittedAt,
    })
    return { id, submittedAt }
  },
})

export const getById = query({
  args: { id: v.id(TABLES.AUDIT_SUBMISSIONS) },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id)
  },
})

export const patchReport = mutation({
  args: {
    id: v.id(TABLES.AUDIT_SUBMISSIONS),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('delivered')
      )
    ),
    reportUrl: v.optional(v.string()),
    reportMarkdown: v.optional(v.string()),
    hoursSavedPerWeekMin: v.optional(v.number()),
    hoursSavedPerWeekMax: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    const patch: Record<string, unknown> = {}
    if (rest.status !== undefined) patch.status = rest.status
    if (rest.reportUrl !== undefined) patch.reportUrl = rest.reportUrl
    if (rest.reportMarkdown !== undefined) patch.reportMarkdown = rest.reportMarkdown
    if (rest.hoursSavedPerWeekMin !== undefined) {
      patch.hoursSavedPerWeekMin = rest.hoursSavedPerWeekMin
    }
    if (rest.hoursSavedPerWeekMax !== undefined) {
      patch.hoursSavedPerWeekMax = rest.hoursSavedPerWeekMax
    }
    await ctx.db.patch(id, patch)
  },
})
