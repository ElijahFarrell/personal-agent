import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { workspace } from '@/mastra/workspace'
import { invalidateAllWorkspaceCaches } from '@/mastra/createWorkspaceForTenant'
import { listSkills } from '@/services/skillsService'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Refreshes the Mastra workspace skill index and syncs preferences to Convex.
 * Call after adding/modifying SKILL.md files to pick up changes.
 */
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await convex.query(api.users.getUserByClerkUserId, {
    clerkUserId: userId,
  })

  if (!dbUser) {
    return NextResponse.json(
      { error: 'User not provisioned yet.' },
      { status: 400 }
    )
  }

  if (typeof workspace.init === 'function') {
    await workspace.init()
  }
  await workspace.skills?.refresh()
  invalidateAllWorkspaceCaches()

  const skills = await listSkills({
    tenantId: String(dbUser.tenantId),
    userId: String(dbUser._id),
  })
  const skillNames = skills.map((s) => s.name)

  const result = await convex.mutation(api.skills.syncSkillPreferences, {
    tenantId: dbUser.tenantId,
    skillNames,
  })

  return NextResponse.json({
    ok: true,
    refreshed: skills.length,
    newPreferences: result.synced,
  })
}
