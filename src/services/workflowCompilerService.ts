import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import {
  createEmailAgent,
  createResearchAgent,
  createCalendarAgent,
  createLinkedInAgent,
  createContentAgent,
  createInstagramAgent,
  createBrowserAgent,
  createMessagingAgent,
  createDocsAgent,
  createCrmAgent,
  createProjectAgent,
  createRealEstateAgent,
  createFinanceAgent,
  createMarketingAgent,
  createSDRAgent,
} from '@/mastra/agents'
import { AGENT_BY_TOOL_ID, type AgentId } from '@/constants/agents'
import { createAgentTools } from '@/mastra/tools/agentTools'

// ─── Types ───────────────────────────────────────────────────────────────────

export type WorkflowNodeType =
  | 'agent'
  | 'tool'
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
  data?: {
    label?: string
    config?: WorkflowNodeConfig
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
}

// ─── Agent factory ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AGENT_FACTORIES: Record<string, (userId: string, tenantId?: string) => Promise<any>> = {
  email: async (userId) => createEmailAgent(userId),
  research: async (userId) => createResearchAgent(userId),
  calendar: async (userId) => (await createCalendarAgent(userId, [])).agent,
  linkedin: async (userId) => createLinkedInAgent(userId),
  content: async (userId) => createContentAgent(userId),
  instagram: async (userId) => createInstagramAgent(userId),
  browser: async (userId) => createBrowserAgent(userId),
  messaging: async (userId) => (await createMessagingAgent(userId, [])).agent,
  docs: async (userId) => (await createDocsAgent(userId, [])).agent,
  crm: async (userId) => (await createCrmAgent(userId, [])).agent,
  project: async (userId) => (await createProjectAgent(userId, [])).agent,
  realEstate: async (userId) => (await createRealEstateAgent(userId, [])).agent,
  finance: async (userId) => (await createFinanceAgent(userId, [])).agent,
  marketing: async (userId) => (await createMarketingAgent(userId, [])).agent,
  sdr: async (userId, tenantId) => createSDRAgent(userId, tenantId ?? ''),
}

async function getAgentForNode(agentId: string, userId: string, tenantId: string) {
  const factory = AGENT_FACTORIES[agentId]
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
  const { userId, tenantId, workflowId } = context
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
          const tools = createAgentTools(userId, tenantId) as unknown as Record<
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
