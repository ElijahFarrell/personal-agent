import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getTenantContext } from '@/middleware/tenantContext'
import { getNextRunAt } from '@/services/scheduleService'
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

async function requireScheduleAccess(scheduleId: Id<'schedules'>) {
  const { userId } = await getTenantContext()

  const dbUser = await convex
    .query(api.users.getUserByClerkUserId, { clerkUserId: userId })
    .catch(() => null)

  if (!dbUser) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  }

  const schedule = await convex.query(api.schedules.getById, { scheduleId })
  if (!schedule) {
    return { error: NextResponse.json({ error: 'Schedule not found' }, { status: 404 }) }
  }

  if (schedule.tenantId !== dbUser.tenantId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { schedule, dbUser }
}

/**
 * GET /api/schedules/[id] — Get a single schedule with logs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const scheduleId = id as Id<'schedules'>

    const result = await requireScheduleAccess(scheduleId)
    if ('error' in result) return result.error

    const logs = await convex.query(api.schedules.getLogsByScheduleId, {
      scheduleId,
      limit: 20,
    })

    return NextResponse.json({
      schedule: result.schedule,
      logs,
    })
  } catch (error) {
    console.error('[Schedules API] GET [id] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/schedules/[id] — Update a schedule.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const scheduleId = id as Id<'schedules'>

    const result = await requireScheduleAccess(scheduleId)
    if ('error' in result) return result.error

    const body = (await req.json()) as {
      name?: string
      description?: string
      cronExpression?: string
      timezone?: string
      action?: {
        type: 'workflow' | 'agent_prompt'
        workflowId?: Id<'workflowDefinitions'>
        agentPrompt?: string
        inputData?: Record<string, unknown>
      }
      isEnabled?: boolean
      autoApprove?: boolean
    }

    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.description !== undefined) updates.description = body.description?.trim()
    if (body.cronExpression !== undefined) updates.cronExpression = body.cronExpression.trim()
    if (body.timezone !== undefined) updates.timezone = body.timezone
    if (body.action !== undefined) updates.action = body.action
    if (body.isEnabled !== undefined) updates.isEnabled = body.isEnabled
    if (body.autoApprove !== undefined) updates.autoApprove = body.autoApprove

    if (body.cronExpression || body.timezone) {
      updates.nextRunAt = getNextRunAt(
        (body.cronExpression ?? result.schedule.cronExpression) as string,
        (body.timezone ?? result.schedule.timezone) as string
      )
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ scheduleId })
    }

    await convex.mutation(api.schedules.update, {
      scheduleId,
      name: updates.name as string | undefined,
      description: updates.description as string | undefined,
      cronExpression: updates.cronExpression as string | undefined,
      timezone: updates.timezone as string | undefined,
      action: updates.action as typeof body.action | undefined,
      isEnabled: updates.isEnabled as boolean | undefined,
      autoApprove: updates.autoApprove as boolean | undefined,
      nextRunAt: updates.nextRunAt as number | undefined,
    })

    return NextResponse.json({ scheduleId })
  } catch (error) {
    console.error('[Schedules API] PUT [id] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/schedules/[id] — Delete a schedule.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const scheduleId = id as Id<'schedules'>

    const result = await requireScheduleAccess(scheduleId)
    if ('error' in result) return result.error

    await convex.mutation(api.schedules.remove, { scheduleId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Schedules API] DELETE [id] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
