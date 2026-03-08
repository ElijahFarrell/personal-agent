import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import {
  getSkillsHealth,
  listSkills,
  mergeSkillsWithPreferences,
  resolveSkillsForMessage,
} from '@/services/skillsService'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * GET /api/skills — List retrievable skills and optional retrieval diagnostics.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await getTenantContext()

    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch(() => null)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const skillScope = {
      tenantId: String(dbUser.tenantId),
      userId: String(dbUser._id),
    }

    const [skills, prefs] = await Promise.all([
      listSkills(skillScope),
      convex.query(api.skills.getSkillPreferences, {
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
      }),
    ])

    const preferences = prefs.map((preference) => ({
      skillName: preference.skillName,
      isEnabled: preference.isEnabled,
      isPinned: preference.isPinned,
    }))
    const [health, resolved] = await Promise.all([
      getSkillsHealth(preferences, skillScope),
      (async () => {
        const query = req.nextUrl.searchParams.get('q')?.trim()
        if (!query) return []
        return resolveSkillsForMessage(query, preferences, 5, skillScope)
      })(),
    ])

    const merged = mergeSkillsWithPreferences(skills, preferences)

    return NextResponse.json({
      skills: merged,
      health,
      resolved: resolved.map(({ skill, score, isPinned }) => ({
        name: skill.name,
        score,
        isPinned,
      })),
    })
  } catch (error) {
    console.error('[Skills API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
