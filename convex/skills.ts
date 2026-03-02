import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, SCOPE, TABLES } from './constants'

const scopeValidator = v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER))

export const getOrgSkills = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.TENANT_SKILLS)
      .withIndex(INDEXES.BY_TENANT_SCOPE, (q) =>
        q.eq('tenantId', tenantId).eq('scope', SCOPE.ORG)
      )
      .collect()
  },
})

export const getUserSkills = query({
  args: { userId: v.id(TABLES.USERS) },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query(TABLES.TENANT_SKILLS)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .collect()
  },
})

/**
 * Fetches org + user skills for a given tenant/user, merging them so that
 * a user-scoped skill with the same name as an org skill takes precedence.
 */
export const getAllSkillsForChat = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
  },
  handler: async (ctx, { tenantId, userId }) => {
    const [orgSkills, userSkills] = await Promise.all([
      ctx.db
        .query(TABLES.TENANT_SKILLS)
        .withIndex(INDEXES.BY_TENANT_SCOPE, (q) =>
          q.eq('tenantId', tenantId).eq('scope', SCOPE.ORG)
        )
        .collect(),
      ctx.db
        .query(TABLES.TENANT_SKILLS)
        .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
        .collect(),
    ])

    const userSkillNames = new Set(userSkills.map((s) => s.name.toLowerCase()))
    const deduped = orgSkills.filter((s) => !userSkillNames.has(s.name.toLowerCase()))

    return [...deduped, ...userSkills]
  },
})

/** Kept for backward compat — returns all skills for a tenant (both scopes). */
export const getSkillsByTenantId = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.TENANT_SKILLS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .collect()
  },
})

export const getSkillById = query({
  args: { skillId: v.id(TABLES.TENANT_SKILLS) },
  handler: async (ctx, { skillId }) => {
    return await ctx.db.get(skillId)
  },
})

export const createSkill = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    scope: scopeValidator,
    name: v.string(),
    description: v.string(),
    systemPrompt: v.string(),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, { tenantId, userId, scope, name, description, systemPrompt, isEnabled }) => {
    return await ctx.db.insert(TABLES.TENANT_SKILLS, {
      tenantId,
      userId,
      scope,
      name,
      description,
      systemPrompt,
      isEnabled,
      createdAt: Date.now(),
    })
  },
})

export const updateSkill = mutation({
  args: {
    skillId: v.id(TABLES.TENANT_SKILLS),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, { skillId, ...fields }) => {
    const existing = await ctx.db.get(skillId)
    if (!existing) throw new Error('Skill not found')

    const updates: Record<string, string | boolean> = {}
    if (fields.name !== undefined) updates.name = fields.name
    if (fields.description !== undefined) updates.description = fields.description
    if (fields.systemPrompt !== undefined) updates.systemPrompt = fields.systemPrompt
    if (fields.isEnabled !== undefined) updates.isEnabled = fields.isEnabled

    await ctx.db.patch(skillId, updates)
    return skillId
  },
})

export const deleteSkill = mutation({
  args: { skillId: v.id(TABLES.TENANT_SKILLS) },
  handler: async (ctx, { skillId }) => {
    const existing = await ctx.db.get(skillId)
    if (!existing) throw new Error('Skill not found')
    await ctx.db.delete(skillId)
    return skillId
  },
})

export const toggleSkill = mutation({
  args: { skillId: v.id(TABLES.TENANT_SKILLS) },
  handler: async (ctx, { skillId }) => {
    const existing = await ctx.db.get(skillId)
    if (!existing) throw new Error('Skill not found')
    await ctx.db.patch(skillId, { isEnabled: !existing.isEnabled })
    return !existing.isEnabled
  },
})

/**
 * Replaces all org-scoped skills for a tenant with the provided list.
 * Used by the seed route to sync filesystem skills into Convex.
 * Only touches org-scoped skills — user skills are left untouched.
 */
export const syncSkills = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    skills: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        systemPrompt: v.string(),
        isEnabled: v.boolean(),
      })
    ),
  },
  handler: async (ctx, { tenantId, skills }) => {
    const existing = await ctx.db
      .query(TABLES.TENANT_SKILLS)
      .withIndex(INDEXES.BY_TENANT_SCOPE, (q) =>
        q.eq('tenantId', tenantId).eq('scope', SCOPE.ORG)
      )
      .collect()

    await Promise.all(existing.map((s) => ctx.db.delete(s._id)))

    await Promise.all(
      skills.map((skill) =>
        ctx.db.insert(TABLES.TENANT_SKILLS, {
          ...skill,
          tenantId,
          scope: SCOPE.ORG,
          createdAt: Date.now(),
        })
      )
    )

    return skills.length
  },
})
