'use client'

import { useMemo, useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import { chatToolHint, chatToolTitle } from '@/constants/chatToolUi'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  Lightbulb,
  Zap,
  Wrench,
  CheckCircle2,
  Clock,
  Circle,
  ListTree,
} from 'lucide-react'

function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith('tool-') || part.type === 'tool-invocation'
}

function mapToolState(
  state: string
): 'input-available' | 'input-streaming' | 'output-available' | 'output-error' {
  if (state === 'output-error' || state === 'error') return 'output-error'
  if (state === 'result' || state === 'output-available') return 'output-available'
  if (state === 'call' || state === 'partial-call') return 'input-streaming'
  return 'input-available'
}

function isChartToolName(toolName: string): boolean {
  return toolName === 'generate-chart' || toolName === 'generateChart'
}

export type ToolRowModel = {
  id: string
  fullToolId: string
  toolName: string
  title: string
  mappedState: ReturnType<typeof mapToolState>
  args?: Record<string, unknown>
  result?: unknown
  errorText?: string
}

function normalizeParts(parts: Array<Record<string, unknown>> | undefined): {
  reasoningText: string
  phaseLabel: string | null
  milestoneLabel: string | null
  skillItems: Array<{ id: string; name: string; score: number }>
  toolRows: ToolRowModel[]
} {
  if (!parts?.length) {
    return {
      reasoningText: '',
      phaseLabel: null,
      milestoneLabel: null,
      skillItems: [],
      toolRows: [],
    }
  }

  const reasoningChunks: string[] = []
  let phaseLabel: string | null = null
  let milestoneLabel: string | null = null
  const skillItems: Array<{ id: string; name: string; score: number }> = []
  const toolRows: ToolRowModel[] = []

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const t = part.type as string
    if (t === 'reasoning' && typeof (part as { text?: string }).text === 'string') {
      reasoningChunks.push((part as { text: string }).text)
    }
    if (t === 'data-chat-phase') {
      const label = (part as { data?: { label?: string } }).data?.label
      if (label) phaseLabel = label
    }
    if (t === 'data-chat-milestone') {
      const label = (part as { data?: { label?: string } }).data?.label
      if (label) milestoneLabel = label
    }
    if (t === 'data-skills') {
      const data = (part as { data?: { items?: unknown } }).data
      const items = data?.items
      if (Array.isArray(items)) {
        for (const item of items as Array<{ id?: string; name?: string; score?: number }>) {
          if (item?.id && item?.name) {
            skillItems.push({
              id: item.id,
              name: item.name,
              score: typeof item.score === 'number' ? item.score : 0,
            })
          }
        }
      }
    }
    if (!isToolPart(part as { type: string })) continue
    const p = part as {
      type: string
      toolInvocation?: Record<string, unknown>
    }
    const inv = p.toolInvocation ?? part
    const toolName = p.type.startsWith('tool-')
      ? p.type.slice(5)
      : (inv as { toolName?: string }).toolName ?? 'unknown'
    const state = (inv as { state?: string }).state ?? 'output-available'
    const mappedState = mapToolState(state)
    const invAny = inv as {
      args?: Record<string, unknown>
      result?: unknown
      input?: unknown
      output?: unknown
    }
    const argsRaw = invAny.args ?? invAny.input
    const args =
      argsRaw && typeof argsRaw === 'object' && !Array.isArray(argsRaw)
        ? (argsRaw as Record<string, unknown>)
        : undefined
    const result = invAny.result ?? invAny.output
    const fullToolId = p.type.startsWith('tool-') ? p.type : `tool-${toolName}`
    toolRows.push({
      id: `${toolName}-${i}`,
      fullToolId,
      toolName,
      title: chatToolTitle(fullToolId),
      mappedState,
      args,
      result,
      errorText: mappedState === 'output-error' ? String(result ?? 'Error') : undefined,
    })
  }

  return {
    reasoningText: reasoningChunks.join('\n\n').trim(),
    phaseLabel,
    milestoneLabel,
    skillItems,
    toolRows,
  }
}

function StatusDot({
  mappedState,
}: {
  mappedState: ToolRowModel['mappedState']
}) {
  if (mappedState === 'output-available') {
    return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500/90" aria-hidden />
  }
  if (mappedState === 'output-error') {
    return <Circle className="size-3.5 shrink-0 text-destructive" aria-hidden />
  }
  if (mappedState === 'input-available' || mappedState === 'input-streaming') {
    return <Clock className="size-3.5 shrink-0 animate-pulse text-primary/80" aria-hidden />
  }
  return <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
}

export type MessageActivityTraceProps = {
  parts: Array<Record<string, unknown>> | undefined
  isStreaming?: boolean
}

export function MessageActivityTrace({ parts, isStreaming }: MessageActivityTraceProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const { reasoningText, phaseLabel, milestoneLabel, skillItems, toolRows } = useMemo(
    () => normalizeParts(parts),
    [parts]
  )

  const nonChartTools = useMemo(
    () => toolRows.filter((r) => !isChartToolName(r.toolName)),
    [toolRows]
  )
  const chartTools = useMemo(
    () => toolRows.filter((r) => isChartToolName(r.toolName)),
    [toolRows]
  )

  const hasContent =
    reasoningText.length > 0 ||
    phaseLabel ||
    milestoneLabel ||
    skillItems.length > 0 ||
    toolRows.length > 0

  if (!hasContent) return null

  const showDetails = nonChartTools.some(
    (r) =>
      (r.args && Object.keys(r.args).length > 0) ||
      r.result !== undefined ||
      r.mappedState === 'output-error'
  )

  return (
    <div
      className="mb-3 w-full max-w-full rounded-lg border border-border/50 bg-muted/20"
      aria-label="Agent activity"
    >
      <Collapsible defaultOpen={!!isStreaming}>
        <CollapsibleTrigger
          className={cn(
            'flex w-full items-center justify-between gap-2 px-3 py-2 text-left',
            'text-xs font-medium text-muted-foreground hover:bg-muted/40',
            'rounded-t-lg data-[state=open]:rounded-b-none'
          )}
        >
          <span className="flex items-center gap-2">
            <ListTree className="size-3.5 shrink-0 opacity-80" aria-hidden />
            Activity
            {isStreaming && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-normal text-primary">
                Live
              </span>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 transition-transform duration-200 data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/40 px-3 pb-3 pt-1">
          <div className="flex flex-col gap-2.5">
            {reasoningText.length > 0 && (
              <div className="rounded-md border border-border/30 bg-background/40 px-2.5 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Lightbulb className="size-3" aria-hidden />
                  Thinking
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {reasoningText}
                </pre>
              </div>
            )}

            {phaseLabel && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Zap className="mt-0.5 size-3.5 shrink-0 text-amber-500/80" aria-hidden />
                <span>{phaseLabel}</span>
              </div>
            )}

            {milestoneLabel && milestoneLabel !== phaseLabel && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Zap className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
                <span>{milestoneLabel}</span>
              </div>
            )}

            {skillItems.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skillItems.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/50 px-2 py-0.5 text-[11px] text-foreground/90"
                    >
                      <Zap className="size-3 text-amber-400/90" aria-hidden />
                      {s.name}
                      {s.score > 0 && (
                        <span className="tabular-nums text-muted-foreground">
                          {(s.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {toolRows.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Tools
                </div>
                <ul className="flex flex-col gap-1" role="list">
                  {toolRows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <StatusDot mappedState={row.mappedState} />
                      <Wrench className="size-3 shrink-0 opacity-50" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-foreground/90">
                        {row.title}
                        {isChartToolName(row.toolName) && (
                          <span className="ml-1 text-[10px] text-muted-foreground">(chart)</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {chartTools.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Chart preview appears below the reply.
                  </p>
                )}
              </div>
            )}

            {showDetails && nonChartTools.length > 0 && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => setSheetOpen(true)}
                >
                  View tool details
                </Button>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                      <SheetTitle>Tool details</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 flex flex-col gap-6">
                      {nonChartTools.map((row) => {
                        const hint = chatToolHint(row.fullToolId)
                        return (
                          <div
                            key={row.id}
                            className="rounded-lg border border-border/60 bg-card/40 p-3"
                          >
                            <h4 className="mb-2 text-sm font-medium text-foreground">
                              {row.title}
                            </h4>
                            {hint && (
                              <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
                            )}
                            {row.args && Object.keys(row.args).length > 0 && (
                              <ToolInput input={row.args} />
                            )}
                            {(row.result !== undefined || row.mappedState === 'output-error') && (
                              <ToolOutput
                                output={row.result}
                                errorText={row.errorText}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/** Extract chart specs from tool parts for rendering below assistant text. */
export function extractChartSpecsFromParts(
  parts: Array<Record<string, unknown>> | undefined
): import('./ChartRenderer').ChartSpec[] {
  if (!parts?.length) return []
  const specs: import('./ChartRenderer').ChartSpec[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!isToolPart(part as { type: string })) continue
    const p = part as { type: string; toolInvocation?: Record<string, unknown> }
    const inv = p.toolInvocation ?? part
    const toolName = p.type.startsWith('tool-')
      ? p.type.slice(5)
      : (inv as { toolName?: string }).toolName ?? ''
    if (!isChartToolName(toolName)) continue
    const state = (inv as { state?: string }).state ?? ''
    const mapped = mapToolState(state)
    if (mapped !== 'output-available') continue
    const invAny = inv as { result?: unknown; output?: unknown }
    const out = invAny.result ?? invAny.output as
      | { chartSpec?: import('./ChartRenderer').ChartSpec }
      | undefined
    if (
      out &&
      typeof out === 'object' &&
      'chartSpec' in out &&
      out.chartSpec &&
      typeof (out as { chartSpec: unknown }).chartSpec === 'object'
    ) {
      specs.push((out as { chartSpec: import('./ChartRenderer').ChartSpec }).chartSpec)
    }
  }
  return specs
}
