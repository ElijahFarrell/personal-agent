import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { config } from '@/lib/config'
import { createOrchestratorAgent } from '@/mastra/agents/orchestrator'
import { executeSchedule, getNextRunAt } from '@/services/scheduleService'
import type { ScheduleRecord } from '@/services/scheduleService'
import type { WorkflowDefinition } from '@/services/workflowCompilerService'
import { SCHEDULE_LOG_STATUS, WORKFLOW_RUN_STATUS } from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)
  const signingKey = config.inngest.signingKey
  const cronSecret = config.cron.secret

  if (signingKey && token === signingKey) return true
  if (cronSecret && token === cronSecret) return true
  return false
}

/**
 * GET handler for schedule cron execution.
 * Called every minute by Vercel Cron. Queries due schedules and runs them.
 * Protected by Authorization: Bearer <INNGEST_SIGNING_KEY|CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()

  try {
    const schedules = await convex.query(api.schedules.getDueSchedules, {
      beforeTimestamp: now,
    })

    if (schedules.length === 0) {
      return NextResponse.json({ executed: 0, message: 'No due schedules' })
    }

    const results: Array<{ scheduleId: string; status: string; error?: string }> = []

    for (const schedule of schedules) {
      const scheduleRecord = schedule as ScheduleRecord
      const scheduleId = schedule._id

      try {
        await convex.mutation(api.schedules.addLog, {
          scheduleId,
          tenantId: schedule.tenantId,
          runId: undefined,
          status: SCHEDULE_LOG_STATUS.RUNNING,
          startedAt: now,
        })

        const [user, tenant] = await Promise.all([
          convex.query(api.users.getUserById, { userId: schedule.userId }),
          convex.query(api.tenants.getTenantById, { tenantId: schedule.tenantId }),
        ])

        const clerkUserId = user?.clerkUserId ?? String(schedule.userId)
        const clerkTenantId = tenant?.clerkOrgId ?? String(schedule.tenantId)

        const result = await executeSchedule(scheduleRecord, {
          executeAgentPrompt: async ({ userId: _uid, tenantId: _tid, prompt }) => {
            try {
              const agent = await createOrchestratorAgent(clerkUserId, clerkTenantId)
              const response = await agent.generate([
                { role: 'user' as const, content: prompt },
              ])
              return {
                status: 'success' as const,
                result: response.text,
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unknown error'
              return { status: 'failed' as const, error: message }
            }
          },
          executeWorkflow: async ({ workflowId, userId: clerkUserId, tenantId: clerkTenantId, inputData, autoApprove }) => {
            try {
              const workflowDef = await convex.query(api.workflowDefinitions.getById, {
                workflowId,
              })
              if (!workflowDef) {
                return { status: 'failed' as const, error: 'Workflow not found' }
              }
              const dbUser = await convex.query(api.users.getUserByClerkUserId, {
                clerkUserId,
              })
              if (!dbUser) {
                return { status: 'failed' as const, error: 'User not found' }
              }
              const convexRunId = await convex.mutation(api.workflowRuns.create, {
                workflowDefinitionId: workflowId,
                tenantId: schedule.tenantId,
                userId: dbUser._id,
                inputData: inputData ?? {},
                autoApprove,
              })
              const { compileWorkflow } = await import('@/services/workflowCompilerService')
              const workflow = await compileWorkflow(
                workflowDef.definition as WorkflowDefinition,
                {
                  userId: clerkUserId,
                  tenantId: clerkTenantId,
                  workflowId: `schedule-${workflowId}`,
                  creditsCheck: async (tid, minRequired) => {
                    const balance = await convex.query(api.credits.getCreditBalance, {
                      tenantId: tid as typeof schedule.tenantId,
                    })
                    return balance >= minRequired
                  },
                }
              )
              const w = workflow as {
                createRun: (opts?: { runId?: string }) => Promise<{
                  runId?: string
                  start: (opts: { inputData?: unknown }) => Promise<{
                    status: string
                    result?: unknown
                    suspended?: string[]
                  }>
                  resume: (opts: { resumeData: { approved: boolean } }) => Promise<{
                    status: string
                    result?: unknown
                  }>
                }>
              }
              const run = await w.createRun({ runId: String(convexRunId) })
              const result = await run.start({
                inputData: { value: inputData ?? {} },
              })
              const status =
                result.status === 'success'
                  ? WORKFLOW_RUN_STATUS.SUCCESS
                  : result.status === 'suspended'
                    ? WORKFLOW_RUN_STATUS.SUSPENDED
                    : WORKFLOW_RUN_STATUS.FAILED
              await convex.mutation(api.workflowRuns.updateStatus, {
                runId: convexRunId,
                status,
                mastraRunId: run.runId ?? String(convexRunId),
                result: result.result,
                suspendedAt: result.suspended?.[0],
                completedAt: result.status !== 'suspended' ? now : undefined,
              })
              if (result.status === 'suspended' && autoApprove) {
                const resumed = await run.resume({
                  resumeData: { approved: true },
                })
                const resumedStatus =
                  resumed.status === 'success'
                    ? WORKFLOW_RUN_STATUS.SUCCESS
                    : resumed.status === 'suspended'
                      ? WORKFLOW_RUN_STATUS.SUSPENDED
                      : WORKFLOW_RUN_STATUS.FAILED
                await convex.mutation(api.workflowRuns.updateStatus, {
                  runId: convexRunId,
                  status: resumedStatus,
                  result: resumed.result,
                  completedAt: resumed.status !== 'suspended' ? now : undefined,
                })
                return {
                  status: (resumed.status === 'success' ? 'success' : resumed.status) as 'success' | 'failed' | 'suspended',
                  result: resumed.result,
                  runId: String(convexRunId),
                }
              }
              return {
                status: result.status as 'success' | 'failed' | 'suspended',
                result: result.result,
                runId: result.status === 'suspended' ? String(convexRunId) : undefined,
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unknown error'
              return { status: 'failed' as const, error: message }
            }
          },
        })

        const logStatus =
          result.status === 'success'
            ? SCHEDULE_LOG_STATUS.SUCCESS
            : result.status === 'suspended'
              ? SCHEDULE_LOG_STATUS.SUSPENDED
              : SCHEDULE_LOG_STATUS.FAILED

        await convex.mutation(api.schedules.addLog, {
          scheduleId,
          tenantId: schedule.tenantId,
          runId: (result as { runId?: string }).runId,
          status: logStatus,
          startedAt: now,
          completedAt: Date.now(),
          error: result.error,
          result: result.result,
        })

        const nextRunAt = getNextRunAt(schedule.cronExpression, schedule.timezone)

        await convex.mutation(api.schedules.updateAfterRun, {
          scheduleId,
          lastRunAt: now,
          lastRunStatus: result.status,
          nextRunAt,
        })

        results.push({
          scheduleId: String(scheduleId),
          status: result.status,
          error: result.error,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[Cron Execute] Schedule ${scheduleId} failed:`, err)

        await convex.mutation(api.schedules.addLog, {
          scheduleId,
          tenantId: schedule.tenantId,
          status: SCHEDULE_LOG_STATUS.FAILED,
          startedAt: now,
          completedAt: Date.now(),
          error: message,
        })

        const nextRunAt = getNextRunAt(schedule.cronExpression, schedule.timezone)
        await convex.mutation(api.schedules.updateAfterRun, {
          scheduleId,
          lastRunAt: now,
          lastRunStatus: 'failed',
          nextRunAt,
        })

        results.push({
          scheduleId: String(scheduleId),
          status: 'failed',
          error: message,
        })
      }
    }

    return NextResponse.json({
      executed: results.length,
      results,
    })
  } catch (error) {
    console.error('[Cron Execute] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
