'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnConnect,
  Panel,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Bot,
  Wrench,
  UserCheck,
  Timer,
  Play,
  Save,
  Loader2,
  ArrowLeft,
  Shield,
  PhoneCall,
  MessagesSquare,
  Mail,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { AGENT_REGISTRY } from '@/constants/agents'

const NODE_TYPES = [
  'agent',
  'tool',
  'suspend',
  'sleep',
  'sms',
  'voice_call',
  'email',
] as const

function AgentNode({ data }: { data: { label?: string; agentId?: string } }) {
  return (
    <Card className="min-w-[180px]">
      <Handle type="target" position={Position.Left} />
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4" />
          {data.label ?? 'Agent'}
        </CardTitle>
        {data.agentId && (
          <p className="text-xs text-muted-foreground">{data.agentId}</p>
        )}
      </CardHeader>
      <Handle type="source" position={Position.Right} />
    </Card>
  )
}

function ToolNode({ data }: { data: { label?: string } }) {
  return (
    <Card className="min-w-[180px]">
      <Handle type="target" position={Position.Left} />
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wrench className="h-4 w-4" />
          {data.label ?? 'Tool'}
        </CardTitle>
      </CardHeader>
      <Handle type="source" position={Position.Right} />
    </Card>
  )
}

function SuspendNode({ data }: { data: { label?: string } }) {
  return (
    <Card className="min-w-[180px] border-amber-500/50">
      <Handle type="target" position={Position.Left} />
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <UserCheck className="h-4 w-4" />
          {data.label ?? 'Human Approval'}
        </CardTitle>
      </CardHeader>
      <Handle type="source" position={Position.Right} />
    </Card>
  )
}

function SleepNode({ data }: { data: { label?: string; milliseconds?: number } }) {
  return (
    <Card className="min-w-[180px]">
      <Handle type="target" position={Position.Left} />
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Timer className="h-4 w-4" />
          {data.label ?? 'Sleep'}
        </CardTitle>
        {data.milliseconds && (
          <p className="text-xs text-muted-foreground">{data.milliseconds}ms</p>
        )}
      </CardHeader>
      <Handle type="source" position={Position.Right} />
    </Card>
  )
}

function SmsNode({ data }: { data: { label?: string } }) {
  return (
    <Card className="min-w-[180px] border-sky-500/40">
      <Handle type="target" position={Position.Left} />
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessagesSquare className="h-4 w-4" />
          {data.label ?? 'SMS'}
        </CardTitle>
      </CardHeader>
      <Handle type="source" position={Position.Right} />
    </Card>
  )
}

function VoiceCallNode({ data }: { data: { label?: string } }) {
  return (
    <Card className="min-w-[180px] border-violet-500/40">
      <Handle type="target" position={Position.Left} />
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <PhoneCall className="h-4 w-4" />
          {data.label ?? 'Voice call'}
        </CardTitle>
      </CardHeader>
      <Handle type="source" position={Position.Right} />
    </Card>
  )
}

function EmailNode({ data }: { data: { label?: string } }) {
  return (
    <Card className="min-w-[180px] border-amber-500/40">
      <Handle type="target" position={Position.Left} />
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4" />
          {data.label ?? 'Email'}
        </CardTitle>
      </CardHeader>
      <Handle type="source" position={Position.Right} />
    </Card>
  )
}

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  suspend: SuspendNode,
  sleep: SleepNode,
  sms: SmsNode,
  voice_call: VoiceCallNode,
  email: EmailNode,
}

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'input',
    position: { x: 100, y: 200 },
    data: { label: 'Start' },
  },
]

const initialEdges: Edge[] = []

function WorkflowBuilderContent() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('id') as Id<'workflowDefinitions'> | null

  const { user } = useUser()
  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const existingWorkflow = useQuery(
    api.workflowDefinitions.getById,
    editId ? { workflowId: editId } : 'skip'
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    if (editId && existingWorkflow?.definition) {
      const def = existingWorkflow.definition as { nodes?: Node[]; edges?: Edge[] }
      if (def.nodes?.length) {
        setNodes(
          def.nodes.map((node) => {
            const raw = (node.data ?? {}) as Record<string, unknown>
            const cfg = raw.config as Record<string, unknown> | undefined
            const data: Record<string, unknown> =
              cfg && typeof cfg === 'object'
                ? { ...raw, ...cfg, config: cfg }
                : { ...raw }
            return { ...node, data } as Node
          })
        )
      }
      if (def.edges?.length) setEdges(def.edges)
    }
  }, [editId, existingWorkflow?._id])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [name, setName] = useState(existingWorkflow?.name ?? '')
  const [description, setDescription] = useState(existingWorkflow?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const addNode = (type: (typeof NODE_TYPES)[number], agentId?: string) => {
    const id = `${type}-${Date.now()}`
    const labels: Partial<Record<(typeof NODE_TYPES)[number], string>> = {
      sms: 'Send SMS',
      voice_call: 'Voice call',
      email: 'Marketing email',
    }
    const newNode: Node = {
      id,
      type,
      position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 },
      data: {
        label:
          type === 'agent' && agentId
            ? AGENT_REGISTRY.find((a) => a.id === agentId)?.displayName ?? agentId
            : (labels[type] ?? type),
        agentId: type === 'agent' ? agentId : undefined,
        emailProvider: type === 'email' ? 'mailchimp' : undefined,
      },
    }
    setNodes((nds) => [...nds, newNode])
  }

  const updateNodeData = (nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      )
    )
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, ...data } } : null
      )
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      window.alert('Name is required')
      return
    }
    setSaving(true)
    try {
      const definition = getDefinition()
      if (editId) {
        const res = await fetch(`/api/workflows/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, definition }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Save failed')
        }
        window.alert('Workflow updated')
      } else {
        const res = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, definition }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Save failed')
        }
        const { workflowId } = await res.json()
        window.location.href = `/dashboard/workflows/builder?id=${workflowId}`
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async () => {
    const workflowId = editId
    if (!workflowId) {
      window.alert('Save the workflow first before running')
      return
    }
    setRunning(true)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputData: {}, autoApprove: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Run failed')
      window.alert(`Run completed: ${data.status}`)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  const getDefinition = () => ({
    nodes: nodes.map((n) => {
      const d = n.data as Record<string, unknown> | undefined
      const nested = (d?.config as Record<string, unknown> | undefined) ?? {}
      return {
        id: n.id,
        type: n.type ?? 'agent',
        data: {
          label: d?.label,
          config: {
            ...nested,
            agentId: d?.agentId ?? nested.agentId,
            prompt: d?.prompt ?? nested.prompt,
            toolName: d?.toolName ?? nested.toolName,
            toolParams: d?.toolParams ?? nested.toolParams,
            composioToolName: d?.composioToolName ?? nested.composioToolName,
            emailProvider: d?.emailProvider ?? nested.emailProvider,
            reason: d?.reason ?? nested.reason,
            milliseconds: d?.milliseconds ?? nested.milliseconds,
            guardrails: d?.guardrails ?? nested.guardrails,
          },
        },
        position: n.position,
      }
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  })

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/workflows">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Input
            placeholder="Workflow name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64"
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
          <Button variant="secondary" onClick={handleRun} disabled={running || !editId}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 border-r bg-muted/30 p-4">
          <p className="mb-3 text-sm font-medium">Add Node</p>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addNode('agent')}
            >
              <Bot className="mr-2 h-4 w-4" />
              Agent
            </Button>
            {AGENT_REGISTRY.slice(0, 5).map((a) => (
              <Button
                key={a.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => addNode('agent', a.id)}
              >
                {a.displayName}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addNode('tool')}
            >
              <Wrench className="mr-2 h-4 w-4" />
              Tool
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addNode('suspend')}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Human Approval
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addNode('sleep')}
            >
              <Timer className="mr-2 h-4 w-4" />
              Sleep
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addNode('sms')}
            >
              <MessagesSquare className="mr-2 h-4 w-4" />
              Send SMS
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addNode('voice_call')}
            >
              <PhoneCall className="mr-2 h-4 w-4" />
              Voice call
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addNode('email')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send email
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {selectedNode && selectedNode.type && NODE_TYPES.includes(selectedNode.type as (typeof NODE_TYPES)[number]) && (
          <div className="w-72 shrink-0 border-l bg-muted/30 p-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configure Node</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={(selectedNode.data?.label as string) ?? ''}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, { label: e.target.value })
                    }
                  />
                </div>
                {selectedNode.type === 'agent' && (
                  <div>
                    <Label>Agent</Label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={(selectedNode.data?.agentId as string) ?? 'research'}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          agentId: e.target.value,
                          label: AGENT_REGISTRY.find((a) => a.id === e.target.value)?.displayName,
                        })
                      }
                    >
                      {AGENT_REGISTRY.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedNode.type === 'agent' && (
                  <div>
                    <Label>Prompt</Label>
                    <textarea
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      rows={3}
                      value={(selectedNode.data?.prompt as string) ?? ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { prompt: e.target.value })
                      }
                      placeholder="Task for the agent..."
                    />
                  </div>
                )}
                {selectedNode.type === 'agent' && (
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <Label>Guardrails</Label>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Cost limit (credits)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="No limit"
                        value={
                          (selectedNode.data?.guardrails as { costLimit?: number })
                            ?.costLimit ?? ''
                        }
                        onChange={(e) => {
                          const v = e.target.value
                          const costLimit = v ? parseInt(v, 10) : undefined
                          updateNodeData(selectedNode.id, {
                            guardrails: {
                              ...((selectedNode.data?.guardrails as object) ?? {}),
                              costLimit: costLimit && costLimit > 0 ? costLimit : undefined,
                            },
                          })
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Rate limit (runs/min)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="No limit"
                        value={
                          (selectedNode.data?.guardrails as { rateLimitPerMin?: number })
                            ?.rateLimitPerMin ?? ''
                        }
                        onChange={(e) => {
                          const v = e.target.value
                          const rateLimitPerMin = v ? parseInt(v, 10) : undefined
                          updateNodeData(selectedNode.id, {
                            guardrails: {
                              ...((selectedNode.data?.guardrails as object) ?? {}),
                              rateLimitPerMin:
                                rateLimitPerMin && rateLimitPerMin > 0
                                  ? rateLimitPerMin
                                  : undefined,
                            },
                          })
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Content moderation
                      </Label>
                      <Switch
                        checked={
                          (selectedNode.data?.guardrails as {
                            contentModeration?: boolean
                          })?.contentModeration ?? false
                        }
                        onCheckedChange={(checked) =>
                          updateNodeData(selectedNode.id, {
                            guardrails: {
                              ...((selectedNode.data?.guardrails as object) ?? {}),
                              contentModeration: checked,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
                {selectedNode.type === 'suspend' && (
                  <div>
                    <Label>Reason (shown when paused)</Label>
                    <Input
                      value={(selectedNode.data?.reason as string) ?? ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { reason: e.target.value })
                      }
                      placeholder="Human approval required"
                    />
                  </div>
                )}
                {selectedNode.type === 'sleep' && (
                  <div>
                    <Label>Milliseconds</Label>
                    <Input
                      type="number"
                      value={(selectedNode.data?.milliseconds as number) ?? 1000}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          milliseconds: parseInt(e.target.value, 10) || 1000,
                        })
                      }
                    />
                  </div>
                )}
                {(selectedNode.type === 'sms' ||
                  selectedNode.type === 'voice_call' ||
                  selectedNode.type === 'email') && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Tool slug (optional override)
                      </Label>
                      <Input
                        placeholder="e.g. SMS_ALERT_SEND_SMS"
                        value={(selectedNode.data?.composioToolName as string) ?? ''}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            composioToolName: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                    {selectedNode.type === 'email' && (
                      <div>
                        <Label>Provider</Label>
                        <select
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={(selectedNode.data?.emailProvider as string) ?? 'mailchimp'}
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, {
                              emailProvider: e.target.value as 'mailchimp' | 'lemlist',
                            })
                          }
                        >
                          <option value="mailchimp">Mailchimp</option>
                          <option value="lemlist">Lemlist</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <Label>Tool arguments (JSON)</Label>
                      <textarea
                        key={`${selectedNode.id}-toolParams`}
                        className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                        rows={6}
                        placeholder='{"to": "+1...", "body": "Hello"}'
                        defaultValue={JSON.stringify(
                          (selectedNode.data?.toolParams as Record<string, unknown>) ?? {},
                          null,
                          2
                        )}
                        onBlur={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value || '{}') as Record<
                              string,
                              unknown
                            >
                            updateNodeData(selectedNode.id, { toolParams: parsed })
                          } catch {
                            window.alert('Invalid JSON in tool arguments')
                          }
                        }}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkflowBuilderPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] items-center justify-center">Loading...</div>}>
      <WorkflowBuilderContent />
    </Suspense>
  )
}
