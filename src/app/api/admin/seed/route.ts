import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { loadAllSkills } from '@/skills/skillLoader'
import { reindexSkillsFromDB, ensureCollection } from '@/skills/skillRetriever'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST() {
  const { userId, orgId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await convex.query(api.users.getUserByClerkUserId, {
    clerkUserId: userId,
  })

  if (!dbUser) {
    return NextResponse.json(
      { error: 'User not provisioned yet — load the dashboard first, then retry.' },
      { status: 400 }
    )
  }

  const qdrantTenantId = orgId ?? userId
  const convexTenantId = dbUser.tenantId

  const skills = await loadAllSkills()

  // Sync filesystem skills into Convex as org-scoped
  await convex.mutation(api.skills.syncSkills, {
    tenantId: convexTenantId,
    skills: skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      systemPrompt: skill.rawContent,
      isEnabled: true,
    })),
  })

  // Fetch all Convex records (org + user) and re-index into Qdrant
  await ensureCollection()
  const dbSkills = await convex.query(api.skills.getSkillsByTenantId, {
    tenantId: convexTenantId,
  })
  await reindexSkillsFromDB(
    qdrantTenantId,
    dbSkills.map((s) => ({
      ...s,
      _id: String(s._id),
      scope: (s.scope ?? 'org') as 'org' | 'user',
      userId: s.userId ? String(s.userId) : undefined,
    }))
  )

  console.log(
    `[Seed] Synced ${skills.length} skills | qdrantTenant=${qdrantTenantId} convexTenant=${convexTenantId} ` +
    `(orgId=${orgId ?? 'none'} clerkUserId=${userId})`
  )

  return NextResponse.json({
    ok: true,
    seeded: skills.length,
    skills: skills.map((s) => s.name),
  })
}
