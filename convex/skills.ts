import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, SCOPE, TABLES } from './constants'

const scopeValidator = v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER))

/**
 * Get skill preferences for a tenant + user.
 * Returns org-scoped prefs plus user-scoped prefs (user overrides org by skillName).
 */
export const getSkillPreferences = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
  },
  handler: async (ctx, { tenantId, userId }) => {
    const [orgPrefs, userPrefs] = await Promise.all([
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

    const userSkillNames = new Set(
      userPrefs.map((p) => (p.skillName ?? p.name ?? '').toLowerCase())
    )
    const deduped = orgPrefs.filter(
      (p) => !userSkillNames.has((p.skillName ?? p.name ?? '').toLowerCase())
    )

    return [...deduped, ...userPrefs].map((p) => ({
      _id: p._id,
      skillName: p.skillName ?? p.name ?? '',
      isEnabled: p.isEnabled,
      isPinned: p.isPinned ?? false,
      scope: p.scope ?? SCOPE.ORG,
    }))
  },
})

/**
 * Legacy query — returns preferences formatted for the chat skill picker.
 */
export const getAllSkillsForChat = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.id(TABLES.USERS),
  },
  handler: async (ctx, { tenantId, userId }) => {
    const [orgPrefs, userPrefs] = await Promise.all([
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

    const userSkillNames = new Set(
      userPrefs.map((p) => (p.skillName ?? p.name ?? '').toLowerCase())
    )
    const deduped = orgPrefs.filter(
      (p) => !userSkillNames.has((p.skillName ?? p.name ?? '').toLowerCase())
    )

    return [...deduped, ...userPrefs].map((p) => ({
      _id: p._id,
      name: p.skillName ?? p.name ?? '',
      description: p.description ?? '',
      isEnabled: p.isEnabled,
      isPinned: p.isPinned ?? false,
    }))
  },
})

export const getSkillsByTenantId = query({
  args: { tenantId: v.id(TABLES.TENANTS) },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query(TABLES.TENANT_SKILLS)
      .withIndex(INDEXES.BY_TENANT_ID, (q) => q.eq('tenantId', tenantId))
      .collect()
  },
})

export const toggleSkillEnabled = mutation({
  args: { skillId: v.id(TABLES.TENANT_SKILLS) },
  handler: async (ctx, { skillId }) => {
    const existing = await ctx.db.get(skillId)
    if (!existing) throw new Error('Skill preference not found')
    await ctx.db.patch(skillId, { isEnabled: !existing.isEnabled })
    return !existing.isEnabled
  },
})

export const toggleSkillPinned = mutation({
  args: { skillId: v.id(TABLES.TENANT_SKILLS) },
  handler: async (ctx, { skillId }) => {
    const existing = await ctx.db.get(skillId)
    if (!existing) throw new Error('Skill preference not found')
    const newPinned = !(existing.isPinned ?? false)
    await ctx.db.patch(skillId, { isPinned: newPinned })
    return newPinned
  },
})

/**
 * Sync discovered filesystem skills into Convex as org-scoped preferences.
 * Creates a preference record for any new skill; leaves existing records untouched.
 */
export const syncSkillPreferences = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    skillNames: v.array(v.string()),
  },
  handler: async (ctx, { tenantId, skillNames }) => {
    const existing = await ctx.db
      .query(TABLES.TENANT_SKILLS)
      .withIndex(INDEXES.BY_TENANT_SCOPE, (q) =>
        q.eq('tenantId', tenantId).eq('scope', SCOPE.ORG)
      )
      .collect()

    const existingNames = new Set(
      existing.map((e) => (e.skillName ?? e.name ?? '').toLowerCase())
    )

    let created = 0
    for (const skillName of skillNames) {
      if (existingNames.has(skillName.toLowerCase())) continue
      await ctx.db.insert(TABLES.TENANT_SKILLS, {
        tenantId,
        scope: SCOPE.ORG,
        skillName,
        isEnabled: true,
        isPinned: false,
        createdAt: Date.now(),
      })
      created++
    }

    return { synced: created, total: skillNames.length }
  },
})

/**
 * @deprecated Use syncSkillPreferences instead.
 * Kept for backward compatibility with the old seed route.
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

    const existingNames = new Set(
      existing.map((e) => (e.skillName ?? e.name ?? '').toLowerCase())
    )

    let created = 0
    for (const skill of skills) {
      if (existingNames.has(skill.name.toLowerCase())) continue
      await ctx.db.insert(TABLES.TENANT_SKILLS, {
        tenantId,
        scope: SCOPE.ORG,
        skillName: skill.name,
        name: skill.name,
        description: skill.description,
        systemPrompt: skill.systemPrompt,
        isEnabled: skill.isEnabled,
        isPinned: false,
        createdAt: Date.now(),
      })
      created++
    }

    return created
  },
})

export const createSkill = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    scope: scopeValidator,
    skillName: v.string(),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, { tenantId, userId, scope, skillName, isEnabled }) => {
    return await ctx.db.insert(TABLES.TENANT_SKILLS, {
      tenantId,
      userId,
      scope,
      skillName,
      isEnabled,
      isPinned: false,
      createdAt: Date.now(),
    })
  },
})

export const deleteSkill = mutation({
  args: { skillId: v.id(TABLES.TENANT_SKILLS) },
  handler: async (ctx, { skillId }) => {
    const existing = await ctx.db.get(skillId)
    if (!existing) throw new Error('Skill preference not found')
    await ctx.db.delete(skillId)
    return skillId
  },
})

// Legacy aliases
export const toggleSkill = toggleSkillEnabled
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
export const getSkillById = query({
  args: { skillId: v.id(TABLES.TENANT_SKILLS) },
  handler: async (ctx, { skillId }) => {
    return await ctx.db.get(skillId)
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
    if (fields.name !== undefined) {
      updates.name = fields.name
      updates.skillName = fields.name
    }
    if (fields.description !== undefined) updates.description = fields.description
    if (fields.systemPrompt !== undefined) updates.systemPrompt = fields.systemPrompt
    if (fields.isEnabled !== undefined) updates.isEnabled = fields.isEnabled

    await ctx.db.patch(skillId, updates)
    return skillId
  },
})
