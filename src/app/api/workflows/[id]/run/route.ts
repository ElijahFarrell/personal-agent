import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'
import {
  compileWorkflow,
  type WorkflowDefinition,
} from '@/services/workflowCompilerService'
import { WORKFLOW_RUN_STATUS } from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/workflows/[id]/run — Start a workflow run.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workflowDefinitionId = id as Id<'workflowDefinitions'>

    const { userId } = await getTenantContext()

    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch(() => null)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const workflowDef = await convex.query(api.workflowDefinitions.getById, {
      workflowId: workflowDefinitionId,
    })
    if (!workflowDef || workflowDef.tenantId !== dbUser.tenantId) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const body = (await req.json()) as { inputData?: Record<string, unknown>; autoApprove?: boolean }
    const inputData = body.inputData ?? {}
    const autoApprove = body.autoApprove ?? false

    const runId = await convex.mutation(api.workflowRuns.create, {
      workflowDefinitionId,
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      inputData,
      autoApprove,
    })

    try {
      const workflow = await compileWorkflow(
        workflowDef.definition as WorkflowDefinition,
        {
          userId: String(dbUser.clerkUserId),
          tenantId: String(dbUser.tenantId),
          workflowId: `compiled-${workflowDefinitionId}`,
          creditsCheck: async (tid, minRequired) => {
            const balance = await convex.query(api.credits.getCreditBalance, {
              tenantId: tid as typeof dbUser.tenantId,
            })
            return balance >= minRequired
          },
        }
      )

      await convex.mutation(api.workflowRuns.updateStatus, {
        runId,
        status: WORKFLOW_RUN_STATUS.RUNNING,
      })

      const w = workflow as {
        createRun: (opts?: { runId?: string }) => Promise<{
          runId?: string
          start: (opts: { inputData?: unknown }) => Promise<{
            status: string
            result?: unknown
            suspended?: string[]
            steps?: Record<string, unknown>
          }>
        }>
      }
      const run = await w.createRun({ runId: String(runId) })
      const result = await run.start({
        inputData: { value: inputData },
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
        runId,
        status,
        mastraRunId: run.runId ?? String(runId),
        result: result.result,
        suspendedAt: result.suspended?.[0],
        completedAt: Date.now(),
      })

      return NextResponse.json({
        runId,
        status,
        result: result.result,
        suspended: result.suspended,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await convex.mutation(api.workflowRuns.updateStatus, {
        runId,
        status: WORKFLOW_RUN_STATUS.FAILED,
        completedAt: Date.now(),
      })
      return NextResponse.json({ error: message, runId }, { status: 500 })
    }
  } catch (error) {
    console.error('[Workflows API] POST run Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
