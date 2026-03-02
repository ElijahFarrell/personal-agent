import { mutation } from './_generated/server'
import { SCOPE, TABLES } from './constants'

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
