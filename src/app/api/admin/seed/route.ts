import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { listSkills } from '@/services/skillsService'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

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
      { error: 'User not provisioned yet — load the dashboard first, then retry.' },
      { status: 400 }
    )
  }

  const skills = await listSkills({
    tenantId: String(dbUser.tenantId),
    userId: String(dbUser._id),
  })
  const skillNames = skills.map((s) => s.name)

  const result = await convex.mutation(api.skills.syncSkillPreferences, {
    tenantId: dbUser.tenantId,
    skillNames,
  })

  console.log(
    `[Seed] Synced ${result.synced} new skill preferences (${result.total} total) ` +
    `for tenant ${String(dbUser.tenantId)} (clerkUserId=${userId})`
  )

  return NextResponse.json({
    ok: true,
    seeded: result.synced,
    total: result.total,
    skills: skillNames,
  })
}
