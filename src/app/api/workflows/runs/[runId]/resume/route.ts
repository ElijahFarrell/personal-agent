import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'
import {
  compileWorkflow,
  type WorkflowDefinition,
} from '@/services/workflowCompilerService'
import { resolvePlatformForClerkUser } from '@/platform/niche'
import { WORKFLOW_RUN_STATUS } from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/workflows/runs/[runId]/resume — Resume a suspended workflow run.
 */
export async function POST(
  req: NextRequest,
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

    if (run.status !== WORKFLOW_RUN_STATUS.SUSPENDED) {
      return NextResponse.json(
        { error: 'Run is not suspended. Only suspended runs can be resumed.' },
        { status: 400 }
      )
    }

    const body = (await req.json()) as {
      step?: string
      resumeData: { approved: boolean; feedback?: string }
    }
    const { step, resumeData } = body

    if (!resumeData || typeof resumeData.approved !== 'boolean') {
      return NextResponse.json(
        { error: 'resumeData.approved (boolean) is required' },
        { status: 400 }
      )
    }

    const workflowDef = await convex.query(api.workflowDefinitions.getById, {
      workflowId: run.workflowDefinitionId,
    })
    if (!workflowDef) {
      return NextResponse.json({ error: 'Workflow definition not found' }, { status: 404 })
    }

    const platformResolved = await resolvePlatformForClerkUser(
      convex,
      String(dbUser.clerkUserId),
      dbUser.tenantId
    )
    const workflow = await compileWorkflow(
      workflowDef.definition as WorkflowDefinition,
      {
        userId: String(dbUser.clerkUserId),
        tenantId: String(dbUser.tenantId),
        workflowId: `compiled-${run.workflowDefinitionId}`,
        platformResolved,
        creditsCheck: async (tid, minRequired) => {
          const balance = await convex.query(api.credits.getCreditBalance, {
            tenantId: tid as typeof dbUser.tenantId,
          })
          return balance >= minRequired
        },
      }
    )

    const w = workflow as {
      createRun: (opts?: { runId?: string }) => Promise<{
        resume: (opts: {
          step?: string
          resumeData: { approved: boolean; feedback?: string }
        }) => Promise<{
          status: string
          result?: unknown
          suspended?: string[]
        }>
      }>
    }

    const mastraRunId = run.mastraRunId ?? runId
    const runInstance = await w.createRun({ runId: mastraRunId })
    const result = await runInstance.resume({
      step: step ?? run.suspendedAt,
      resumeData,
    })

    const status =
      result.status === 'success'
        ? WORKFLOW_RUN_STATUS.SUCCESS
        : result.status === 'suspended'
          ? WORKFLOW_RUN_STATUS.SUSPENDED
          : result.status === 'failed'
            ? WORKFLOW_RUN_STATUS.FAILED
            : WORKFLOW_RUN_STATUS.RUNNING

    await convex.mutation(api.workflowRuns.updateStatus, {
      runId: runId as Id<'workflowRuns'>,
      status,
      result: result.result,
      suspendedAt: result.suspended?.[0],
      completedAt: status !== WORKFLOW_RUN_STATUS.SUSPENDED ? Date.now() : undefined,
    })

    return NextResponse.json({
      runId,
      status,
      result: result.result,
      suspended: result.suspended,
    })
  } catch (error) {
    console.error('[Workflows API] POST resume Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
