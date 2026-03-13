import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'
import { getNextRunAt } from '@/services/scheduleService'
import { SCHEDULE_ACTION_TYPE } from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * GET /api/schedules — List schedules for the current tenant.
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

    const schedules = await convex.query(api.schedules.listByTenantId, {
      tenantId: dbUser.tenantId,
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('[Schedules API] GET Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/schedules — Create a new schedule.
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
      cronExpression: string
      timezone?: string
      action: {
        type: 'workflow' | 'agent_prompt'
        workflowId?: Id<'workflowDefinitions'>
        agentPrompt?: string
        inputData?: Record<string, unknown>
      }
      isEnabled?: boolean
      autoApprove?: boolean
    }

    const {
      name,
      description,
      cronExpression,
      timezone = 'UTC',
      action,
      isEnabled = true,
      autoApprove = false,
    } = body

    if (!name?.trim() || !cronExpression?.trim()) {
      return NextResponse.json(
        { error: 'name and cronExpression are required' },
        { status: 400 }
      )
    }

    if (!action?.type) {
      return NextResponse.json(
        { error: 'action.type is required (workflow or agent_prompt)' },
        { status: 400 }
      )
    }

    if (action.type === SCHEDULE_ACTION_TYPE.AGENT_PROMPT && !action.agentPrompt?.trim()) {
      return NextResponse.json(
        { error: 'action.agentPrompt is required for agent_prompt type' },
        { status: 400 }
      )
    }

    if (action.type === SCHEDULE_ACTION_TYPE.WORKFLOW && !action.workflowId) {
      return NextResponse.json(
        { error: 'action.workflowId is required for workflow type' },
        { status: 400 }
      )
    }

    const nextRunAt = getNextRunAt(cronExpression, timezone)

    const scheduleId = await convex.mutation(api.schedules.create, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      name: name.trim(),
      description: description?.trim(),
      cronExpression: cronExpression.trim(),
      timezone,
      action: {
        type: action.type,
        workflowId: action.workflowId,
        agentPrompt: action.agentPrompt,
        inputData: action.inputData,
      },
      isEnabled,
      autoApprove,
      nextRunAt,
    })

    return NextResponse.json({ scheduleId })
  } catch (error) {
    console.error('[Schedules API] POST Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
