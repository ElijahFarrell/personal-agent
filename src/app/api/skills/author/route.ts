import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import { workspace, convexSkillSource } from '@/mastra/workspace'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

interface AuthorSkillInput {
  skillName: string
  description: string
  content: string
  scope?: 'org' | 'user'
  references?: Record<string, string>
}

/**
 * POST /api/skills/author — Create or update a user-authored skill.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getTenantContext()
    const body = (await request.json()) as AuthorSkillInput

    if (!body.skillName || !body.content) {
      return NextResponse.json(
        { error: 'skillName and content are required' },
        { status: 400 }
      )
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const scope = body.scope ?? 'org'

    const skillId = await convex.mutation(api.skillContent.saveAuthoredSkill, {
      tenantId: dbUser.tenantId,
      userId: scope === 'user' ? dbUser._id : undefined,
      scope,
      skillName: body.skillName,
      description: body.description || '',
      content: body.content,
      references: body.references,
    })

    try {
      await convex.mutation(api.skills.createSkill, {
        tenantId: dbUser.tenantId,
        userId: scope === 'user' ? dbUser._id : undefined,
        scope,
        skillName: body.skillName,
        isEnabled: true,
      })
    } catch {
      // Preference record may already exist
    }

    convexSkillSource?.invalidateCache()
    await workspace.skills?.refresh()

    return NextResponse.json({
      success: true,
      skill: { id: skillId, name: body.skillName, description: body.description },
    })
  } catch (error) {
    console.error('[Skills Author] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save skill' },
      { status: 500 }
    )
  }
}
