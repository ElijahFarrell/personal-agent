import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { reindexSkillsFromDB, ensureCollection } from '@/skills/skillRetriever'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Re-indexes all enabled Convex skills (org + user) into Qdrant for the current tenant.
 * Call after any skill CRUD operation to keep the vector store in sync.
 */
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
      { error: 'User not provisioned yet.' },
      { status: 400 }
    )
  }

  const qdrantTenantId = orgId ?? userId

  const skills = await convex.query(api.skills.getSkillsByTenantId, {
    tenantId: dbUser.tenantId,
  })

  await ensureCollection()
  await reindexSkillsFromDB(
    qdrantTenantId,
    skills.map((s) => ({
      ...s,
      _id: String(s._id),
      scope: (s.scope ?? 'org') as 'org' | 'user',
      userId: s.userId ? String(s.userId) : undefined,
    }))
  )

  const enabledCount = skills.filter((s) => s.isEnabled).length

  return NextResponse.json({
    ok: true,
    indexed: enabledCount,
    total: skills.length,
  })
}
