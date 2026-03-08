import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import type { Id } from '@convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/skills/toggle — Toggle a skill enabled/disabled.
 * Body: { skillId: string }
 */
export async function POST(req: NextRequest) {
  try {
    await getTenantContext()
    const { skillId } = (await req.json()) as { skillId: string }

    if (!skillId) {
      return NextResponse.json({ error: 'skillId is required' }, { status: 400 })
    }

    const newState = await convex.mutation(api.skills.toggleSkillEnabled, {
      skillId: skillId as Id<'tenantSkills'>,
    })

    return NextResponse.json({ ok: true, isEnabled: newState })
  } catch (error) {
    console.error('[Skills Toggle API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
