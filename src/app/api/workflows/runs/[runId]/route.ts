import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * GET /api/workflows/runs/[runId] — Get workflow run status and details.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params

    const { userId } = await getTenantContext()

    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch(() => null)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const run = await convex.query(api.workflowRuns.getById, {
      runId: runId as Id<'workflowRuns'>,
    })
    if (!run || run.tenantId !== dbUser.tenantId) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    const steps = await convex.query(api.workflowRuns.getStepsByRunId, {
      runId: runId as Id<'workflowRuns'>,
    })

    return NextResponse.json({ run, steps })
  } catch (error) {
    console.error('[Workflows API] GET run Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
