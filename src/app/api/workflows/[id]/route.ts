import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

async function requireWorkflowAccess(workflowId: Id<'workflowDefinitions'>) {
  const { userId } = await getTenantContext()

  const dbUser = await convex
    .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
    .catch(() => null)

  if (!dbUser) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  }

  const workflow = await convex.query(api.workflowDefinitions.getById, {
    workflowId,
  })
  if (!workflow) {
    return { error: NextResponse.json({ error: 'Workflow not found' }, { status: 404 }) }
  }

  if (workflow.tenantId !== dbUser.tenantId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { workflow, dbUser }
}

/**
 * GET /api/workflows/[id] — Get a single workflow definition.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workflowId = id as Id<'workflowDefinitions'>

    const result = await requireWorkflowAccess(workflowId)
    if ('error' in result) return result.error

    return NextResponse.json({ workflow: result.workflow })
  } catch (error) {
    console.error('[Workflows API] GET [id] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/workflows/[id] — Update a workflow definition.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workflowId = id as Id<'workflowDefinitions'>

    const result = await requireWorkflowAccess(workflowId)
    if ('error' in result) return result.error

    const body = (await req.json()) as {
      name?: string
      description?: string
      definition?: { nodes: unknown[]; edges: unknown[] }
      isPublished?: boolean
    }

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.description !== undefined) updates.description = body.description?.trim()
    if (body.definition !== undefined) updates.definition = body.definition
    if (body.isPublished !== undefined) updates.isPublished = body.isPublished

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ workflowId })
    }

    await convex.mutation(api.workflowDefinitions.update, {
      workflowId,
      ...updates,
    } as Parameters<typeof convex.mutation<typeof api.workflowDefinitions.update>>[1])

    return NextResponse.json({ workflowId })
  } catch (error) {
    console.error('[Workflows API] PUT [id] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workflows/[id] — Delete a workflow definition.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workflowId = id as Id<'workflowDefinitions'>

    const result = await requireWorkflowAccess(workflowId)
    if ('error' in result) return result.error

    await convex.mutation(api.workflowDefinitions.remove, { workflowId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Workflows API] DELETE [id] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
