'use client'

import { useState } from 'react'
import {
  Brain,
  BookMarked,
  Search,
  Globe,
  Wrench,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface ToolCallCardProps {
  toolName: string
  state: 'partial-call' | 'call' | 'result'
  input?: Record<string, unknown>
  output?: unknown
}

const TOOL_META: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  mem0Recall: { label: 'Recalling memories', Icon: Brain },
  mem0Memorize: { label: 'Saving to memory', Icon: BookMarked },
  webSearch: { label: 'Searching the web', Icon: Search },
  tavilySearch: { label: 'Searching the web', Icon: Search },
  exaSearch: { label: 'Researching deeply', Icon: Globe },
}

export function ToolCallCard({ toolName, state, input, output }: ToolCallCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  const meta = TOOL_META[toolName] ?? { label: toolName, Icon: Wrench }
  const { label, Icon } = meta

  const isDone = state === 'result'
  const isLoading = state === 'partial-call' || state === 'call'

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'my-1.5 rounded-lg border bg-gray-900/60 text-xs transition-colors',
          isDone ? 'border-gray-800' : 'border-brand-600/30'
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
            aria-expanded={isOpen}
          >
            {/* Left accent bar */}
            <span
              className={cn(
                'h-4 w-0.5 shrink-0 rounded-full',
                isDone ? 'bg-gray-600' : 'bg-brand-500'
              )}
            />

            {/* Status icon */}
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-400" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
            )}

            {/* Tool icon + label */}
            <Icon
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                isDone ? 'text-gray-500' : 'text-brand-400'
              )}
            />
            <span
              className={cn(
                'font-medium',
                isDone ? 'text-gray-400' : 'text-gray-200'
              )}
            >
              {label}
            </span>

            {/* Expand chevron (only when done and has output) */}
            {isDone && (
              <span className="ml-auto text-gray-600">
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>
            )}
          </button>
        </CollapsibleTrigger>

        {isDone && (
          <CollapsibleContent>
            <div className="border-t border-gray-800 px-3 py-2 space-y-2">
              {input && Object.keys(input).length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                    Input
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-gray-950 p-2 font-mono text-[10px] text-gray-400">
                    {JSON.stringify(input, null, 2)}
                  </pre>
                </div>
              )}
              {output !== undefined && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                    Result
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-gray-950 p-2 font-mono text-[10px] text-gray-400">
                    {typeof output === 'string'
                      ? output.length > 400
                        ? output.slice(0, 400) + '…'
                        : output
                      : JSON.stringify(output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  )
}
