import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { INDEXES, SCOPE, SKILL_SOURCE, TABLES } from './constants'

const scopeValidator = v.union(v.literal(SCOPE.ORG), v.literal(SCOPE.USER))

/**
 * Get all user-authored and installed skills for a tenant.
 * Returns both org-scoped and user-scoped skills (user overrides org by name).
 */
export const getSkillContent = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
  },
  handler: async (ctx, { tenantId, userId }) => {
    const orgSkills = await ctx.db
      .query(TABLES.SKILL_CONTENT)
      .withIndex(INDEXES.BY_TENANT_SCOPE, (q) =>
        q.eq('tenantId', tenantId).eq('scope', SCOPE.ORG)
      )
      .collect()

    if (!userId) return orgSkills

    const userSkills = await ctx.db
      .query(TABLES.SKILL_CONTENT)
      .withIndex(INDEXES.BY_USER_ID, (q) => q.eq('userId', userId))
      .collect()

    const userNames = new Set(userSkills.map((s) => s.skillName.toLowerCase()))
    const deduped = orgSkills.filter((s) => !userNames.has(s.skillName.toLowerCase()))

    return [...deduped, ...userSkills]
  },
})

/**
 * Get a single skill's content by name for a tenant.
 */
export const getSkillByName = query({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    skillName: v.string(),
  },
  handler: async (ctx, { tenantId, skillName }) => {
    const results = await ctx.db
      .query(TABLES.SKILL_CONTENT)
      .withIndex(INDEXES.BY_TENANT_SKILL_NAME, (q) =>
        q.eq('tenantId', tenantId).eq('skillName', skillName)
      )
      .collect()

    return results[0] ?? null
  },
})

/**
 * Save a user-authored skill.
 */
export const saveAuthoredSkill = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    scope: scopeValidator,
    skillName: v.string(),
    description: v.string(),
    content: v.string(),
    references: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query(TABLES.SKILL_CONTENT)
      .withIndex(INDEXES.BY_TENANT_SKILL_NAME, (q) =>
        q.eq('tenantId', args.tenantId).eq('skillName', args.skillName)
      )
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        description: args.description,
        content: args.content,
        references: args.references,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert(TABLES.SKILL_CONTENT, {
      tenantId: args.tenantId,
      userId: args.userId,
      scope: args.scope,
      skillName: args.skillName,
      description: args.description,
      content: args.content,
      source: SKILL_SOURCE.AUTHORED,
      references: args.references,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Install a skill from an external source (GitHub/skills.sh).
 */
export const installSkill = mutation({
  args: {
    tenantId: v.id(TABLES.TENANTS),
    userId: v.optional(v.id(TABLES.USERS)),
    scope: scopeValidator,
    skillName: v.string(),
    description: v.string(),
    content: v.string(),
    sourceUrl: v.string(),
    references: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query(TABLES.SKILL_CONTENT)
      .withIndex(INDEXES.BY_TENANT_SKILL_NAME, (q) =>
        q.eq('tenantId', args.tenantId).eq('skillName', args.skillName)
      )
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        description: args.description,
        content: args.content,
        sourceUrl: args.sourceUrl,
        references: args.references,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert(TABLES.SKILL_CONTENT, {
      tenantId: args.tenantId,
      userId: args.userId,
      scope: args.scope,
      skillName: args.skillName,
      description: args.description,
      content: args.content,
      source: SKILL_SOURCE.INSTALLED,
      sourceUrl: args.sourceUrl,
      references: args.references,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Delete a user skill.
 */
export const deleteSkillContent = mutation({
  args: { skillId: v.id(TABLES.SKILL_CONTENT) },
  handler: async (ctx, { skillId }) => {
    const existing = await ctx.db.get(skillId)
    if (!existing) throw new Error('Skill not found')
    await ctx.db.delete(skillId)
    return skillId
  },
})
