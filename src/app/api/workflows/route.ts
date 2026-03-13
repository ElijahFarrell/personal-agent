import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * GET /api/workflows — List workflow definitions for the current tenant.
 */
export async function GET() {
  try {
    const { userId } = await getTenantContext()

    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch(() => null)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const workflows = await convex.query(api.workflowDefinitions.listByTenantId, {
      tenantId: dbUser.tenantId,
    })

    return NextResponse.json({ workflows })
  } catch (error) {
    console.error('[Workflows API] GET Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workflows — Create a new workflow definition.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getTenantContext()

    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch(() => null)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = (await req.json()) as {
      name: string
      description?: string
      definition: { nodes: unknown[]; edges: unknown[] }
      isPublished?: boolean
    }

    const { name, description, definition, isPublished = false } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!definition?.nodes || !Array.isArray(definition.nodes)) {
      return NextResponse.json(
        { error: 'definition.nodes must be an array' },
        { status: 400 }
      )
    }

    const workflowId = await convex.mutation(api.workflowDefinitions.create, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      name: name.trim(),
      description: description?.trim(),
      definition,
      isPublished,
    })

    return NextResponse.json({ workflowId })
  } catch (error) {
    console.error('[Workflows API] POST Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
