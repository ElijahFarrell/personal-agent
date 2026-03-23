import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'
import { isFeatureEnabled } from '@/constants/featureGating'
import { config } from '@/lib/config'
import {
  buildWorkflowDefinitionFromPlan,
  generateWorkflowPlanFromNl,
} from '@/services/nlWorkflowService'
import { getNextRunAt } from '@/services/scheduleService'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/workflows/nl
 * Body: { prompt: string, save?: boolean }
 * Plans a workflow from natural language; optionally persists definition + schedule.
 */
export async function POST(req: NextRequest) {
  try {
    if (!config.gateway.apiKey) {
      return NextResponse.json(
        { error: 'AI gateway is not configured' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const save = body.save === true

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const tenantCtx = await getTenantContext()
    const { userId, tenantId, config: orgConfig } = tenantCtx

    if (!isFeatureEnabled(orgConfig, 'workflowBuilder')) {
      return NextResponse.json(
        { error: 'Workflow builder is not enabled for your organization.' },
        { status: 403 }
      )
    }

    const dbUser = await convex
      .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
      .catch(() => null)

    if (!dbUser) {
      return NextResponse.json({ error: 'User record not found' }, { status: 400 })
    }

    const plan = await generateWorkflowPlanFromNl(prompt)
    const definition = buildWorkflowDefinitionFromPlan(plan)

    if (!save) {
      return NextResponse.json({
        preview: true,
        plan,
        definition,
      })
    }

    const workflowId = await convex.mutation(api.workflowDefinitions.create, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      name: plan.name,
      description: plan.description,
      definition,
      isPublished: true,
    })

    let scheduleId: Id<'schedules'> | undefined
    if (plan.schedule && isFeatureEnabled(orgConfig, 'scheduledTasks')) {
      const nextRunAt = getNextRunAt(plan.schedule.cronExpression, plan.schedule.timezone)
      const action =
        plan.schedule.runMode === 'workflow'
          ? {
              type: 'workflow' as const,
              workflowId,
              inputData: {},
            }
          : {
              type: 'agent_prompt' as const,
              agentPrompt:
                plan.schedule.agentPrompt ??
                `Run the user's recurring task: ${plan.description}`,
              inputData: {},
            }

      scheduleId = await convex.mutation(api.schedules.create, {
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
        name: `${plan.name} (schedule)`,
        description: plan.description,
        cronExpression: plan.schedule.cronExpression,
        timezone: plan.schedule.timezone,
        action,
        isEnabled: true,
        autoApprove: false,
        nextRunAt,
      })
    }

    return NextResponse.json({
      preview: false,
      workflowId,
      scheduleId,
      plan,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build workflow'
    console.error('[workflows/nl]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
