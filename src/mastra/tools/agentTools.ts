import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { Workspace } from '@mastra/core/workspace'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getNextRunAt } from '@/services/scheduleService'
import type { ResolvedPlatformConfig } from '@/platform/niche/types'
import { createWorkspaceTools } from './workspaceTools'
import { createProspectTools } from './prospectTools'
import { createRunTools } from './runTools'
import {
  buildWorkflowDefinitionFromPlan,
  generateWorkflowPlanFromNl,
} from '@/services/nlWorkflowService'
import {
  compileWorkflow,
  type WorkflowDefinition,
} from '@/services/workflowCompilerService'
import { resolvePlatformForClerkUser } from '@/platform/niche'
import { ensureLegalAcceptance } from '@/services/compliance/legalGate'
import { config } from '@/lib/config'
import {
  SCHEDULE_ACTION_TYPE,
  WORKFLOW_RUN_STATUS,
} from '@convex/constants'
import { getComposioConnectionStatus } from '@/lib/composio'
import { COMPOSIO_PROVIDERS } from '@/lib/composioMappings'
import type { ComposioProvider } from '@/types'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function workflowBuilderEnabled(
  resolved: ResolvedPlatformConfig | undefined
): boolean {
  if (!resolved) return true
  if (resolved.fullPlatformAccess) return true
  return resolved.effectiveFeatures.workflowBuilder === true
}

function scheduledTasksEnabled(
  resolved: ResolvedPlatformConfig | undefined
): boolean {
  if (!resolved) return true
  if (resolved.fullPlatformAccess) return true
  return resolved.effectiveFeatures.scheduledTasks === true
}

/**
 * Optional overrides for context retrieval. Kept exported because callers in the
 * chat pipeline still pass a pre-resolved `qdrantTenantKey` to match workspace
 * + legacy indexing, even though sub-agent wrappers no longer live in this file.
 */
export interface AgentContextRetrieval {
  qdrantTenantKey: string
  scopedUserId?: string
}

/**
 * Orchestrator-only tools that complement the native supervisor pattern.
 *
 * Sub-agents are now registered directly with `new Agent({ agents: {} })` in
 * `src/mastra/agents/orchestrator.ts`, so this factory no longer emits
 * hand-rolled `createTool` wrappers around each specialist agent. The tools
 * here are coordination primitives: scheduling, workflow builder/runner,
 * prospect CRUD, workspace skill loading, and connection checks.
 */
export function createAgentTools(
  userId: string,
  tenantId: string,
  _agentInstructions?: Record<string, string>,
  _connectedProviders: string[] = [],
  _workspace?: Workspace,
  platformResolved?: ResolvedPlatformConfig,
  _contextRetrieval?: AgentContextRetrieval
) {
  const scheduleTools = {
    createSchedule: createTool({
      id: 'create-schedule',
      description:
        'Create a recurring schedule (cron job). Two modes: (1) **Agent prompt** — pass agentPrompt and the orchestrator runs that instruction on each tick. ' +
        '(2) **Saved workflow** — pass workflowDefinitionId (from build-workflow) to run a compiled workflow graph on each tick. ' +
        'Cron format: minute hour day-of-month month day-of-week (e.g. "0 9 * * *" = 9am daily). Timezone defaults to America/New_York.',
      inputSchema: z
        .object({
          name: z.string().describe('Short name for the schedule'),
          description: z.string().optional().describe('What this schedule does'),
          cronExpression: z
            .string()
            .describe('Cron expression, e.g. "0 9 * * *" for 9am daily'),
          timezone: z
            .string()
            .optional()
            .describe('IANA timezone, e.g. America/New_York'),
          workflowDefinitionId: z
            .string()
            .optional()
            .describe(
              'Convex workflow definition id — when set, runs that workflow instead of an agent prompt'
            ),
          agentPrompt: z
            .string()
            .optional()
            .describe(
              'Instruction for the orchestrator each run (required if workflowDefinitionId is omitted)'
            ),
          workflowInputData: z
            .record(z.unknown())
            .optional()
            .describe('Input payload for workflow runs when using workflowDefinitionId'),
          autoApprove: z
            .boolean()
            .optional()
            .describe('If true, auto-approve actions without asking. Default false.'),
        })
        .refine(
          (data) =>
            Boolean(data.workflowDefinitionId?.trim()) || Boolean(data.agentPrompt?.trim()),
          { message: 'Provide either workflowDefinitionId or agentPrompt.' }
        ),
      execute: async (input) => {
        try {
          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: userId,
          })
          if (!dbUser) return 'User not found. Please sign in to create schedules.'

          const nextRunAt = getNextRunAt(
            input.cronExpression,
            input.timezone ?? 'America/New_York'
          )

          const wfId = input.workflowDefinitionId?.trim()
          let action:
            | {
                type: typeof SCHEDULE_ACTION_TYPE.WORKFLOW
                workflowId: Id<'workflowDefinitions'>
                inputData?: Record<string, unknown>
              }
            | {
                type: typeof SCHEDULE_ACTION_TYPE.AGENT_PROMPT
                agentPrompt: string
              }

          if (wfId) {
            const def = await convex.query(api.workflowDefinitions.getById, {
              workflowId: wfId as Id<'workflowDefinitions'>,
            })
            if (!def || def.tenantId !== dbUser.tenantId) {
              return 'Workflow definition not found or access denied.'
            }
            action = {
              type: SCHEDULE_ACTION_TYPE.WORKFLOW,
              workflowId: wfId as Id<'workflowDefinitions'>,
              inputData: input.workflowInputData ?? {},
            }
          } else {
            action = {
              type: SCHEDULE_ACTION_TYPE.AGENT_PROMPT,
              agentPrompt: input.agentPrompt!,
            }
          }

          await convex.mutation(api.schedules.create, {
            tenantId: dbUser.tenantId,
            userId: dbUser._id,
            name: input.name,
            description: input.description,
            cronExpression: input.cronExpression,
            timezone: input.timezone ?? 'America/New_York',
            action,
            isEnabled: true,
            autoApprove: input.autoApprove ?? false,
            nextRunAt,
          })

          const mode = wfId ? 'saved workflow' : 'orchestrator prompt'
          return `Schedule "${input.name}" created (${mode}). It will run ${input.cronExpression} (${input.timezone ?? 'America/New_York'}). Next run: ${new Date(nextRunAt).toLocaleString()}.`
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Failed to create schedule: ${message}`
        }
      },
    }),

    listSchedules: createTool({
      id: 'list-schedules',
      description:
        "List all of the user's schedules. Use when the user asks to see their schedules, cron jobs, or automated tasks.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: userId,
          })
          if (!dbUser) return 'User not found. Please sign in to view schedules.'

          const schedules = await convex.query(api.schedules.listByTenantId, {
            tenantId: dbUser.tenantId,
          })

          if (schedules.length === 0) {
            return 'No schedules configured. You can create one by saying something like "every morning at 9am check my channels and give me a brief".'
          }

          return schedules
            .map(
              (s) =>
                `- **${s.name}** [ID: ${s._id}] (${s.isEnabled ? 'enabled' : 'disabled'}): ${s.cronExpression} ${s.timezone} | Next: ${s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : 'N/A'}`
            )
            .join('\n')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Failed to list schedules: ${message}`
        }
      },
    }),

    toggleSchedule: createTool({
      id: 'toggle-schedule',
      description:
        'Enable or disable a schedule. Use when the user wants to turn a schedule on or off.',
      inputSchema: z.object({
        scheduleId: z.string().describe('The schedule ID (from listSchedules)'),
        isEnabled: z.boolean().describe('true to enable, false to disable'),
      }),
      execute: async (input) => {
        try {
          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: userId,
          })
          if (!dbUser) return 'User not found.'

          await convex.mutation(api.schedules.toggleEnabled, {
            scheduleId: input.scheduleId as Id<'schedules'>,
            isEnabled: input.isEnabled,
          })
          return `Schedule ${input.isEnabled ? 'enabled' : 'disabled'}.`
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Failed to toggle schedule: ${message}`
        }
      },
    }),

    deleteSchedule: createTool({
      id: 'delete-schedule',
      description:
        'Delete a schedule permanently. Use when the user wants to remove a schedule.',
      inputSchema: z.object({
        scheduleId: z.string().describe('The schedule ID (from listSchedules)'),
      }),
      execute: async (input) => {
        try {
          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: userId,
          })
          if (!dbUser) return 'User not found.'

          await convex.mutation(api.schedules.remove, {
            scheduleId: input.scheduleId as Id<'schedules'>,
          })
          return 'Schedule deleted.'
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Failed to delete schedule: ${message}`
        }
      },
    }),
  }

  const workflowChatTools = {
    buildWorkflow: createTool({
      id: 'build-workflow',
      description:
        'Design and save an automation workflow from a natural language description. ' +
        'Optionally creates a recurring schedule when the plan includes timing. Returns workflow id and plan summary.',
      inputSchema: z.object({
        prompt: z.string().describe('What the workflow should do, in plain English'),
        createScheduleFromPlan: z
          .boolean()
          .optional()
          .describe(
            'If true and the plan includes a schedule, persist a cron schedule (requires scheduled tasks feature)'
          ),
      }),
      execute: async (input) => {
        try {
          if (!config.gateway.apiKey) {
            return 'AI gateway is not configured; cannot build workflows.'
          }
          if (!workflowBuilderEnabled(platformResolved)) {
            return 'Workflow builder is not enabled for your organization.'
          }

          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: userId,
          })
          if (!dbUser) return 'User not found.'

          const plan = await generateWorkflowPlanFromNl(input.prompt)
          const definition = buildWorkflowDefinitionFromPlan(plan)

          const workflowId = await convex.mutation(api.workflowDefinitions.create, {
            tenantId: dbUser.tenantId,
            userId: dbUser._id,
            name: plan.name,
            description: plan.description,
            definition,
            isPublished: true,
          })

          let scheduleNote = ''
          if (
            input.createScheduleFromPlan &&
            plan.schedule &&
            scheduledTasksEnabled(platformResolved)
          ) {
            const nextRunAt = getNextRunAt(
              plan.schedule.cronExpression,
              plan.schedule.timezone
            )
            const action =
              plan.schedule.runMode === 'workflow'
                ? {
                    type: SCHEDULE_ACTION_TYPE.WORKFLOW,
                    workflowId,
                    inputData: {},
                  }
                : {
                    type: SCHEDULE_ACTION_TYPE.AGENT_PROMPT,
                    agentPrompt:
                      plan.schedule.agentPrompt ??
                      `Run the user's recurring task: ${plan.description}`,
                    inputData: {},
                  }

            const scheduleId = await convex.mutation(api.schedules.create, {
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
            scheduleNote = ` Schedule created: ${scheduleId}.`
          } else if (
            input.createScheduleFromPlan &&
            plan.schedule &&
            !scheduledTasksEnabled(platformResolved)
          ) {
            scheduleNote =
              ' (Schedule was not created: scheduled tasks are not enabled for your organization.)'
          }

          return (
            `Saved workflow **${plan.name}** [workflow id: ${workflowId}].${scheduleNote}\n\n` +
            `Steps: ${plan.steps.map((s) => `${s.label} (${s.agentId})`).join(' → ')}\n` +
            (plan.description ? `\n${plan.description}` : '')
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Failed to build workflow: ${message}`
        }
      },
    }),

    runWorkflow: createTool({
      id: 'run-workflow',
      description:
        'Run a saved workflow definition once (same engine as the Workflows UI). Pass the workflow definition id from build-workflow.',
      inputSchema: z.object({
        workflowDefinitionId: z.string(),
        inputData: z.record(z.unknown()).optional(),
        autoApprove: z.boolean().optional(),
      }),
      execute: async (input) => {
        try {
          if (!workflowBuilderEnabled(platformResolved)) {
            return 'Workflow builder is not enabled for your organization.'
          }

          const dbUser = await convex.query(api.users.getUserByClerkUserId, {
            clerkUserId: userId,
          })
          if (!dbUser) return 'User not found.'

          const workflowDefinitionId =
            input.workflowDefinitionId as Id<'workflowDefinitions'>
          const workflowDef = await convex.query(api.workflowDefinitions.getById, {
            workflowId: workflowDefinitionId,
          })
          if (!workflowDef || workflowDef.tenantId !== dbUser.tenantId) {
            return 'Workflow not found or access denied.'
          }

          await ensureLegalAcceptance({
            tenantId: dbUser.tenantId,
            userId: dbUser._id,
          })

          const inputData = input.inputData ?? {}
          const autoApprove = input.autoApprove ?? false

          const runId = await convex.mutation(api.workflowRuns.create, {
            workflowDefinitionId,
            tenantId: dbUser.tenantId,
            userId: dbUser._id,
            inputData,
            autoApprove,
          })

          const platformResolvedInner = await resolvePlatformForClerkUser(
            convex,
            String(dbUser.clerkUserId),
            dbUser.tenantId
          )
          const workflow = await compileWorkflow(
            workflowDef.definition as WorkflowDefinition,
            {
              userId: String(dbUser.clerkUserId),
              tenantId: String(dbUser.tenantId),
              workflowId: `chat-tool-${workflowDefinitionId}`,
              platformResolved: platformResolvedInner,
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
              }>
              resume: (opts: {
                resumeData: { approved: boolean }
              }) => Promise<{ status: string; result?: unknown }>
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
                : WORKFLOW_RUN_STATUS.FAILED

          await convex.mutation(api.workflowRuns.updateStatus, {
            runId,
            status,
            mastraRunId: run.runId ?? String(runId),
            result: result.result,
            suspendedAt: result.suspended?.[0],
            completedAt: Date.now(),
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
              runId,
              status: resumedStatus,
              result: resumed.result,
              completedAt: Date.now(),
            })
            return `Workflow run ${runId} resumed after suspend. Status: ${resumed.status}. Result: ${JSON.stringify(resumed.result ?? {})}`
          }

          return `Workflow run ${runId} finished with status **${result.status}**.\n\n${JSON.stringify(result.result ?? {}, null, 2)}`
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return `Failed to run workflow: ${message}`
        }
      },
    }),
  }

  /**
   * Live connection check for Composio-backed integrations. Sub-agents call
   * this before any provider tool so they can short-circuit with a structured
   * `NOT_CONNECTED` error instead of hitting Composio and failing.
   */
  const connectionStatusTool = createTool({
    id: 'get-connection-status',
    description:
      'Return the current connection status for Composio providers for the active user. ' +
      'Call this BEFORE any provider-specific tool (Gmail, Apollo, LinkedIn, Meta Ads, ...) ' +
      'to confirm the user has the integration connected. Pass a `providers` list to narrow ' +
      'the check, or omit it to return the full map.',
    inputSchema: z.object({
      providers: z
        .array(z.string())
        .optional()
        .describe(
          'Optional list of provider keys (e.g. `gmail`, `apollo`, `lemlist`). Omit for all.'
        ),
    }),
    outputSchema: z.object({
      ok: z.boolean(),
      connected: z.array(z.string()),
      missing: z.array(z.string()),
      status: z.record(z.string(), z.boolean()),
    }),
    execute: async (input) => {
      try {
        const full = await getComposioConnectionStatus(userId)
        const asked = input.providers?.length
          ? (input.providers.filter((p: string) =>
              (COMPOSIO_PROVIDERS as string[]).includes(p)
            ) as ComposioProvider[])
          : (COMPOSIO_PROVIDERS as ComposioProvider[])
        const status: Record<string, boolean> = {}
        const connected: string[] = []
        const missing: string[] = []
        for (const provider of asked) {
          const isConnected = full[provider] === true
          status[provider] = isConnected
          if (isConnected) connected.push(provider)
          else missing.push(provider)
        }
        return { ok: true, connected, missing, status }
      } catch {
        return {
          ok: false,
          connected: [],
          missing: [],
          status: {} as Record<string, boolean>,
        }
      }
    },
  })

  const prospectToolBag = createProspectTools(userId)
  const workflowToolBag = workflowBuilderEnabled(platformResolved)
    ? workflowChatTools
    : {}
  const scheduleToolBag = scheduledTasksEnabled(platformResolved)
    ? scheduleTools
    : {}

  return {
    ...scheduleToolBag,
    ...workflowToolBag,
    ...prospectToolBag,
    ...createWorkspaceTools(userId, tenantId),
    ...createRunTools(userId, tenantId),
    'get-connection-status': connectionStatusTool,
  }
}
