import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { createOrchestratorAgent } from '@/mastra/agents/orchestrator'
import { executeSchedule } from '@/services/scheduleService'
import type { ScheduleRecord } from '@/services/scheduleService'
import type { WorkflowDefinition } from '@/services/workflowCompilerService'
import { WORKFLOW_RUN_STATUS } from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Composio sends trigger events to this URL (configure in Composio dashboard).
 * Payload shape varies by toolkit; we look for a trigger / instance id to map to automationTriggers.
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    const secret = process.env.COMPOSIO_WEBHOOK_SECRET
    const sig = req.headers.get('x-composio-signature') ?? req.headers.get('x-webhook-signature')
    if (secret && sig !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const triggerInstanceId =
      (body.trigger_id as string) ??
      (body.triggerId as string) ??
      (body.id as string) ??
      (typeof body.data === 'object' && body.data !== null
        ? (body.data as Record<string, unknown>).trigger_id
        : undefined)

    const composioTriggerId = typeof triggerInstanceId === 'string' ? triggerInstanceId : ''
    if (!composioTriggerId) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const binding = await convex.query(api.automationTriggers.getByComposioTriggerId, {
      composioTriggerId,
    })

    if (!binding || !binding.isEnabled) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const user = await convex.query(api.users.getUserById, { userId: binding.userId })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const tenant = await convex.query(api.tenants.getTenantById, { tenantId: binding.tenantId })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    const clerkUserId = user.clerkUserId
    const clerkTenantId = tenant.clerkOrgId

    const scheduleRecord = {
      tenantId: binding.tenantId,
      userId: binding.userId,
      name: 'composio-trigger',
      description: binding.triggerSlug,
      cronExpression: '0 0 * * *',
      timezone: 'UTC',
      action: binding.action,
      isEnabled: true,
      autoApprove: false,
    } as unknown as ScheduleRecord

    const eventSummary = JSON.stringify(body).slice(0, 8000)
    const now = Date.now()

    const result = await executeSchedule(scheduleRecord, {
      executeAgentPrompt: async ({ prompt }) => {
        try {
          const agent = await createOrchestratorAgent(clerkUserId, clerkTenantId)
          const text = `${prompt}\n\n[Composio event payload]\n${eventSummary}`
          const response = await agent.generate([{ role: 'user', content: text }])
          return { status: 'success', result: response.text }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return { status: 'failed', error: message }
        }
      },
      executeWorkflow: async ({
        workflowId,
        userId: uid,
        tenantId: tid,
        inputData,
        autoApprove,
      }) => {
        try {
          const workflowDef = await convex.query(api.workflowDefinitions.getById, {
            workflowId,
          })
          if (!workflowDef) {
            return { status: 'failed', error: 'Workflow not found' }
          }
          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: uid,
          })
          if (!dbUser) {
            return { status: 'failed', error: 'User not found' }
          }
          const convexRunId = await convex.mutation(api.workflowRuns.create, {
            workflowDefinitionId: workflowId,
            tenantId: binding.tenantId,
            userId: dbUser._id,
            inputData: { ...((inputData as Record<string, unknown>) ?? {}), composioEvent: body },
            autoApprove,
          })
          const { compileWorkflow } = await import('@/services/workflowCompilerService')
          const workflow = await compileWorkflow(
            workflowDef.definition as WorkflowDefinition,
            {
              userId: uid,
              tenantId: tid,
              workflowId: `composio-${workflowId}`,
              creditsCheck: async (tenantId, minRequired) => {
                const balance = await convex.query(api.credits.getCreditBalance, {
                  tenantId: tenantId as typeof binding.tenantId,
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
            }>
          }
          const run = await w.createRun({ runId: String(convexRunId) })
          const runResult = await run.start({
            inputData: { value: inputData ?? {}, composioEvent: body },
          })
          const status =
            runResult.status === 'success'
              ? WORKFLOW_RUN_STATUS.SUCCESS
              : runResult.status === 'suspended'
                ? WORKFLOW_RUN_STATUS.SUSPENDED
                : WORKFLOW_RUN_STATUS.FAILED
          await convex.mutation(api.workflowRuns.updateStatus, {
            runId: convexRunId,
            status,
            mastraRunId: run.runId ?? String(convexRunId),
            result: runResult.result,
            suspendedAt: runResult.suspended?.[0],
            completedAt: runResult.status !== 'suspended' ? now : undefined,
          })
          return {
            status: runResult.status as 'success' | 'failed' | 'suspended',
            result: runResult.result,
            runId: String(convexRunId),
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return { status: 'failed', error: message }
        }
      },
    })

    return NextResponse.json({ ok: true, result: result.status })
  } catch (err) {
    console.error('[composio webhook]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook error' },
      { status: 500 }
    )
  }
}
