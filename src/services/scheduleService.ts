import { CronExpressionParser } from 'cron-parser'
import type { Id } from '@convex/_generated/dataModel'

export interface ScheduleRecord {
  _id: Id<'schedules'>
  tenantId: Id<'tenants'>
  userId: Id<'users'>
  name: string
  description?: string
  cronExpression: string
  timezone: string
  action: {
    type: 'workflow' | 'agent_prompt'
    workflowId?: Id<'workflowDefinitions'>
    agentPrompt?: string
    inputData?: Record<string, unknown>
  }
  isEnabled: boolean
  autoApprove: boolean
  lastRunAt?: number
  nextRunAt?: number
  lastRunStatus?: string
}

export interface ExecuteScheduleResult {
  status: 'success' | 'failed' | 'suspended'
  result?: unknown
  error?: string
  runId?: string
}

/**
 * Compute the next run timestamp from a cron expression and timezone.
 * Returns milliseconds since epoch.
 */
export function getNextRunAt(
  cronExpression: string,
  timezone: string
): number {
  try {
    const expr = CronExpressionParser.parse(cronExpression, {
      currentDate: new Date(),
      tz: timezone || 'UTC',
    })
    const next = expr.next()
    return next.getTime()
  } catch (err) {
    console.warn('[ScheduleService] Invalid cron expression:', cronExpression, err)
    // Fallback: run in 1 hour
    return Date.now() + 60 * 60 * 1000
  }
}

export interface ScheduleAction {
  type: 'workflow' | 'agent_prompt'
  workflowId?: Id<'workflowDefinitions'>
  agentPrompt?: string
  inputData?: Record<string, unknown>
}

export interface CreateScheduleInput {
  tenantId: Id<'tenants'>
  userId: Id<'users'>
  name: string
  description?: string
  cronExpression: string
  timezone: string
  action: ScheduleAction
  isEnabled?: boolean
  autoApprove?: boolean
}

export interface ScheduleWithNextRun extends CreateScheduleInput {
  nextRunAt: number
}

/**
 * Validates cron expression and returns next run time.
 */
export function validateAndComputeNextRun(
  cronExpression: string,
  timezone: string
): { valid: boolean; nextRunAt?: number; error?: string } {
  try {
    const nextRunAt = getNextRunAt(cronExpression, timezone)
    return { valid: true, nextRunAt }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid cron expression'
    return { valid: false, error: message }
  }
}

/**
 * Execute a schedule's action. Called by the cron runner.
 * For agent_prompt: invokes the provided executeAgentPrompt callback.
 * For workflow: invokes the provided executeWorkflow callback.
 */
export async function executeSchedule(
  schedule: ScheduleRecord,
  handlers: {
    executeAgentPrompt: (params: {
      userId: string
      tenantId: string
      prompt: string
      inputData?: Record<string, unknown>
    }) => Promise<ExecuteScheduleResult>
    executeWorkflow: (params: {
      workflowId: Id<'workflowDefinitions'>
      userId: string
      tenantId: string
      inputData?: Record<string, unknown>
      autoApprove: boolean
    }) => Promise<ExecuteScheduleResult>
  }
): Promise<ExecuteScheduleResult> {
  const { action, userId, tenantId, autoApprove } = schedule
  const userIdStr = String(userId)
  const tenantIdStr = String(tenantId)

  if (action.type === 'agent_prompt') {
    if (!action.agentPrompt?.trim()) {
      return { status: 'failed', error: 'Missing agent prompt' }
    }
    return handlers.executeAgentPrompt({
      userId: userIdStr,
      tenantId: tenantIdStr,
      prompt: action.agentPrompt,
      inputData: action.inputData,
    })
  }

  if (action.type === 'workflow') {
    if (!action.workflowId) {
      return { status: 'failed', error: 'Missing workflow ID' }
    }
    return handlers.executeWorkflow({
      workflowId: action.workflowId,
      userId: userIdStr,
      tenantId: tenantIdStr,
      inputData: action.inputData,
      autoApprove,
    })
  }

  return { status: 'failed', error: 'Unknown action type' }
}
