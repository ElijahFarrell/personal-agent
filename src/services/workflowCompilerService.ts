import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { AGENT_BY_TOOL_ID, type AgentId } from '@/constants/agents'
import { COMPOSIO_WORKFLOW_DEFAULT_TOOLS } from '@/constants/composioWorkflowTools'
import { WORKFLOW_AGENT_FACTORIES } from '@/platform/agent-catalog'
import { createAgentTools } from '@/mastra/tools/agentTools'
import { executeComposioTool } from '@/lib/composio'
import type { ResolvedPlatformConfig } from '@/platform/niche/types'
import { COMPLIANCE_CHANNEL } from '@convex/constants'
import type { Id } from '@convex/_generated/dataModel'
import { assertComplianceOrThrow } from '@/services/compliance/policyEngine'
import {
  withMandatorySmsOptOut,
  withMandatoryVoiceDisclosures,
} from '@/constants/complianceDisclosures'

// ─── Types ───────────────────────────────────────────────────────────────────

export type WorkflowNodeType =
  | 'agent'
  | 'tool'
  | 'sms'
  | 'voice_call'
  | 'email'
  | 'condition'
  | 'suspend'
  | 'sleep'
  | 'parallel'
  | 'start'
  | 'end'

export interface WorkflowGuardrailsConfig {
  costLimit?: number
  contentModeration?: boolean
  rateLimitPerMin?: number
}

export interface WorkflowNodeConfig {
  agentId?: AgentId
  prompt?: string
  toolName?: string
  toolParams?: Record<string, unknown>
  /** Composio tool slug override for sms / voice_call / email nodes */
  composioToolName?: string
  /** mailchimp | lemlist — used by email node for default tool selection */
  emailProvider?: 'mailchimp' | 'lemlist'
  reason?: string
  resumeSchema?: Record<string, string>
  milliseconds?: number
  untilDate?: string
  condition?: string
  guardrails?: WorkflowGuardrailsConfig
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  /** React Flow layout; ignored by the compiler */
  position?: { x: number; y: number }
  data?: {
    label?: string
    config?: WorkflowNodeConfig
    /** Extra keys from workflow builder / templates (mirrored config, toolParams, etc.) */
    [key: string]: unknown
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface CompileContext {
  userId: string
  tenantId: string
  workflowId: string
  /** Check if tenant has at least minRequired credits. Returns false if insufficient. */
  creditsCheck?: (tenantId: string, minRequired: number) => Promise<boolean>
  /** When set, workflow tool steps use the same delegate tool allowlist as chat. */
  platformResolved?: ResolvedPlatformConfig
}

// ─── Agent factory ────────────────────────────────────────────────────────────

async function getAgentForNode(agentId: string, userId: string, tenantId: string) {
  const factory = WORKFLOW_AGENT_FACTORIES[agentId]
  if (!factory) {
    throw new Error(`Unknown agent: ${agentId}`)
  }
  return factory(userId, tenantId)
}

// ─── Topological sort ────────────────────────────────────────────────────────

function getExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id))
  const startNodes = nodes.filter((n) => n.type === 'start' || !edges.some((e) => e.target === n.id))
  const startId = startNodes[0]?.id ?? nodes[0]?.id

  const outEdges = new Map<string, string[]>()
  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue
    const arr = outEdges.get(e.source) ?? []
    arr.push(e.target)
    outEdges.set(e.source, arr)
  }

  const order: string[] = []
  const visited = new Set<string>()

  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    for (const target of outEdges.get(id) ?? []) {
      visit(target)
    }
    order.push(id)
  }

  visit(startId)
  for (const n of nodes) {
    if (!visited.has(n.id)) visit(n.id)
  }

  return order.reverse()
}

// ─── Compiler ─────────────────────────────────────────────────────────────────

export async function compileWorkflow(
  definition: WorkflowDefinition,
  context: CompileContext
): Promise<unknown> {
  const { userId, tenantId, workflowId, platformResolved } = context
  const { nodes, edges } = definition

  const order = getExecutionOrder(nodes, edges)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const passthroughSchema = z.object({ value: z.any() })
  const passthroughSchemaOut = z.object({ value: z.any() })

  const steps: ReturnType<typeof createStep>[] = []

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId)
    if (!node || node.type === 'start' || node.type === 'end') continue

    const config = node.data?.config ?? {}

    if (node.type === 'agent') {
      const agentId = config.agentId ?? 'research'
      const prompt = config.prompt ?? 'Process the input data'
      const guardrails = config.guardrails
      const costLimit = guardrails?.costLimit
      const creditsCheck = context.creditsCheck

      const step = createStep({
        id: node.id,
        description: node.data?.label ?? `Agent: ${agentId}`,
        inputSchema: passthroughSchema,
        outputSchema: passthroughSchemaOut,
        execute: async ({ inputData, getInitData }) => {
          if (costLimit && costLimit > 0 && creditsCheck) {
            const hasCredits = await creditsCheck(tenantId, costLimit)
            if (!hasCredits) {
              throw new Error(
                `Insufficient credits. This step requires at least ${costLimit} credits.`
              )
            }
          }
          const initData = getInitData<Record<string, unknown>>()
          const agent = await getAgentForNode(agentId, userId, tenantId)
          const task = typeof prompt === 'string' ? prompt : JSON.stringify(prompt)
          const resolvedTask = task.replace(
            /\{\{(\w+)\}\}/g,
            (_, key) => String((inputData as Record<string, unknown>)?.[key] ?? initData?.[key] ?? '')
          )
          const result = await agent.generate(resolvedTask)
          return { value: result.text }
        },
      })
      steps.push(step)
    } else if (node.type === 'tool') {
      const toolName = config.toolName ?? 'research-agent'
      const meta = AGENT_BY_TOOL_ID.get(toolName)
      const agentToolKey = meta ? `${meta.id}Agent` as const : 'researchAgent'
      const step = createStep({
        id: node.id,
        description: node.data?.label ?? `Tool: ${toolName}`,
        inputSchema: passthroughSchema,
        outputSchema: passthroughSchemaOut,
        execute: async ({ inputData }) => {
          const tools = createAgentTools(
            userId,
            tenantId,
            undefined,
            [],
            undefined,
            platformResolved
          ) as unknown as Record<
            string,
            { execute: (input: { task: string }) => Promise<string> }
          >
          const tool = tools[agentToolKey] ?? tools.researchAgent
          if (!tool) throw new Error(`Tool not found: ${toolName}`)
          const task = JSON.stringify(config.toolParams ?? (inputData as Record<string, unknown>))
          const result = await tool.execute({ task })
          return { value: result }
        },
      })
      steps.push(step)
    } else if (node.type === 'suspend') {
      const reason = config.reason ?? 'Human approval required'
      const step = createStep({
        id: node.id,
        description: node.data?.label ?? 'Human approval',
        inputSchema: passthroughSchema,
        outputSchema: passthroughSchemaOut,
        resumeSchema: z.object({
          approved: z.boolean(),
          feedback: z.string().optional(),
        }),
        suspendSchema: z.object({ reason: z.string() }),
        execute: async ({ inputData, resumeData, suspend, bail }) => {
          const approved = resumeData?.approved
          if (approved === false) {
            return bail({ reason: 'User rejected' })
          }
          if (!approved) {
            return await suspend({ reason })
          }
          return { value: (inputData as { value?: unknown })?.value ?? 'approved' }
        },
      })
      steps.push(step)
    } else if (node.type === 'sleep') {
      const ms = config.milliseconds ?? 1000
      const step = createStep({
        id: node.id,
        description: node.data?.label ?? `Sleep ${ms}ms`,
        inputSchema: passthroughSchema,
        outputSchema: passthroughSchemaOut,
        execute: async ({ inputData }) => {
          await new Promise((r) => setTimeout(r, ms))
          return { value: (inputData as { value?: unknown })?.value }
        },
      })
      steps.push(step)
    } else if (node.type === 'sms') {
      const toolName =
        config.composioToolName ?? COMPOSIO_WORKFLOW_DEFAULT_TOOLS.smsSend
      const step = createStep({
        id: node.id,
        description: node.data?.label ?? 'Send SMS (Composio)',
        inputSchema: passthroughSchema,
        outputSchema: passthroughSchemaOut,
        execute: async ({ inputData }) => {
          const prev = (inputData as { value?: unknown })?.value
          const merged = {
            ...(config.toolParams ?? {}),
            ...(prev && typeof prev === 'object' && !Array.isArray(prev)
              ? (prev as Record<string, unknown>)
              : {}),
          }
          const phone =
            (merged.to as string | undefined) ??
            (merged.phone as string | undefined) ??
            (merged.to_number as string | undefined)
          if (phone) {
            await assertComplianceOrThrow({
              tenantId: tenantId as unknown as Id<'tenants'>,
              channel: COMPLIANCE_CHANNEL.SMS,
              phone,
              timezone: merged.timezone as string | undefined,
              stateCode: merged.stateCode as string | undefined,
              payload: merged,
            })
          }
          const body =
            (merged.body as string | undefined) ??
            (merged.message as string | undefined)
          if (typeof body === 'string' && body.trim().length > 0) {
            const withOptOut = withMandatorySmsOptOut(body)
            if ('body' in merged) merged.body = withOptOut
            else merged.message = withOptOut
          }
          const result = await executeComposioTool(userId, toolName, merged)
          return { value: result }
        },
      })
      steps.push(step)
    } else if (node.type === 'voice_call') {
      const toolName =
        config.composioToolName ?? COMPOSIO_WORKFLOW_DEFAULT_TOOLS.retellPhoneCall
      const step = createStep({
        id: node.id,
        description: node.data?.label ?? 'Voice call (Retell / Composio)',
        inputSchema: passthroughSchema,
        outputSchema: passthroughSchemaOut,
        execute: async ({ inputData }) => {
          const prev = (inputData as { value?: unknown })?.value
          const merged = {
            ...(config.toolParams ?? {}),
            ...(prev && typeof prev === 'object' && !Array.isArray(prev)
              ? (prev as Record<string, unknown>)
              : {}),
          }
          const phone =
            (merged.to as string | undefined) ??
            (merged.to_number as string | undefined) ??
            (merged.phone as string | undefined)
          if (phone) {
            await assertComplianceOrThrow({
              tenantId: tenantId as unknown as Id<'tenants'>,
              channel: COMPLIANCE_CHANNEL.VOICE_CALL,
              phone,
              timezone: merged.timezone as string | undefined,
              stateCode: merged.stateCode as string | undefined,
              payload: merged,
            })
          }
          const script =
            (merged.script as string | undefined) ??
            (merged.opening_script as string | undefined)
          const withDisclosure = withMandatoryVoiceDisclosures(script)
          if ('script' in merged) merged.script = withDisclosure
          else merged.opening_script = withDisclosure
          const result = await executeComposioTool(userId, toolName, merged)
          return { value: result }
        },
      })
      steps.push(step)
    } else if (node.type === 'email') {
      const defaultTool =
        config.emailProvider === 'lemlist'
          ? COMPOSIO_WORKFLOW_DEFAULT_TOOLS.lemlistSend
          : COMPOSIO_WORKFLOW_DEFAULT_TOOLS.mailchimpSend
      const toolName = config.composioToolName ?? defaultTool
      const step = createStep({
        id: node.id,
        description: node.data?.label ?? 'Email (Composio)',
        inputSchema: passthroughSchema,
        outputSchema: passthroughSchemaOut,
        execute: async ({ inputData }) => {
          const prev = (inputData as { value?: unknown })?.value
          const merged = {
            ...(config.toolParams ?? {}),
            ...(prev && typeof prev === 'object' && !Array.isArray(prev)
              ? (prev as Record<string, unknown>)
              : {}),
          }
          const phone =
            (merged.phone as string | undefined) ??
            (merged.to as string | undefined)
          if (phone) {
            await assertComplianceOrThrow({
              tenantId: tenantId as unknown as Id<'tenants'>,
              channel: COMPLIANCE_CHANNEL.EMAIL,
              phone,
              timezone: merged.timezone as string | undefined,
              stateCode: merged.stateCode as string | undefined,
              payload: merged,
            })
          }
          const result = await executeComposioTool(userId, toolName, merged)
          return { value: result }
        },
      })
      steps.push(step)
    }
  }

  const inputSchema = z.object({ value: z.any().optional() })
  const outputSchema = z.object({ value: z.any() })

  let workflow = createWorkflow({
    id: workflowId,
    inputSchema,
    outputSchema,
  })

  if (steps.length === 0) {
    workflow = workflow
      .then(
        createStep({
          id: 'noop',
          inputSchema,
          outputSchema,
          execute: async ({ inputData }) => ({ value: inputData?.value ?? null }),
        })
      )
      .commit()
  } else {
    workflow = workflow
      .then(
        createStep({
          id: 'init',
          inputSchema,
          outputSchema: passthroughSchemaOut,
          execute: async ({ inputData }) => ({ value: inputData?.value ?? null }),
        })
      )
      .then(steps[0])

    for (let i = 1; i < steps.length; i++) {
      workflow = workflow.then(steps[i])
    }

    workflow = workflow.commit()
  }

  return Promise.resolve(workflow)
}
