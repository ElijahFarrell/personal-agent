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
  Mail,
  Calendar,
  Linkedin,
  PenTool,
  Instagram,
  Globe2,
  Hash,
  FileText,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface ToolCallCardProps {
  toolName: string
  state: string
  input?: Record<string, unknown>
  output?: unknown
}

const TOOL_META: Record<string, { label: string; activeLabel?: string; Icon: React.ComponentType<{ className?: string }> }> = {
  mem0Recall:       { label: 'Recalled memories',        activeLabel: 'Recalling memories…',       Icon: Brain },
  mem0Memorize:     { label: 'Saved to memory',          activeLabel: 'Saving to memory…',         Icon: BookMarked },
  webSearch:        { label: 'Searched the web',          activeLabel: 'Searching the web…',        Icon: Search },
  tavilySearch:     { label: 'Searched the web',          activeLabel: 'Searching the web…',        Icon: Search },
  exaSearch:        { label: 'Researched deeply',         activeLabel: 'Researching deeply…',       Icon: Globe },
  emailAgent:       { label: 'Email task completed',      activeLabel: 'Working on email…',         Icon: Mail },
  researchAgent:    { label: 'Research completed',        activeLabel: 'Researching…',              Icon: Search },
  calendarAgent:    { label: 'Calendar task completed',   activeLabel: 'Checking calendar…',        Icon: Calendar },
  linkedinAgent:    { label: 'LinkedIn task completed',   activeLabel: 'Working on LinkedIn…',      Icon: Linkedin },
  contentAgent:     { label: 'Content created',           activeLabel: 'Creating content…',         Icon: PenTool },
  instagramAgent:   { label: 'Instagram task completed',  activeLabel: 'Working on Instagram…',     Icon: Instagram },
  browserAgent:     { label: 'Browser task completed',    activeLabel: 'Browsing the web…',         Icon: Globe2 },
  slackAgent:       { label: 'Slack task completed',      activeLabel: 'Working on Slack…',         Icon: Hash },
  notionAgent:      { label: 'Notion task completed',     activeLabel: 'Working on Notion…',        Icon: FileText },
}

function resolveToolName(rawName: string): string {
  if (rawName.startsWith('tool-')) return rawName.slice(5)
  return rawName
    .replace(/-agent$/, 'Agent')
    .replace(/-/g, '')
}

export function ToolCallCard({ toolName, state, input, output }: ToolCallCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  const resolved = resolveToolName(toolName)
  const meta = TOOL_META[resolved] ?? { label: resolved, Icon: Wrench }
  const { Icon } = meta

  const isDone = state === 'result' || state === 'output-available'
  const isError = state === 'output-error'
  const isActive = !isDone && !isError

  const label = isActive
    ? (meta.activeLabel ?? meta.label)
    : isError
      ? `${meta.label} (failed)`
      : meta.label

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'my-1.5 rounded-lg border text-xs transition-colors',
          'bg-gray-900/40 backdrop-blur-sm',
          isDone ? 'border-gray-800/60' : isError ? 'border-red-800/40' : 'border-brand-600/30'
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
            aria-expanded={isOpen}
          >
            <span
              className={cn(
                'h-4 w-0.5 shrink-0 rounded-full',
                isDone ? 'bg-gray-700' : isError ? 'bg-red-500' : 'bg-brand-500'
              )}
            />

            {isActive ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-400" />
            ) : isError ? (
              <span className="h-3.5 w-3.5 shrink-0 text-red-400">!</span>
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            )}

            <Icon
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                isDone ? 'text-gray-500' : isError ? 'text-red-400' : 'text-brand-400'
              )}
            />
            <span
              className={cn(
                'font-medium',
                isDone ? 'text-gray-400' : isError ? 'text-red-300' : 'text-gray-200'
              )}
            >
              {label}
            </span>

            {(isDone || isError) && (
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

        {(isDone || isError) && (
          <CollapsibleContent>
            <div className="border-t border-gray-800/60 px-3 py-2 space-y-2">
              {input && Object.keys(input).length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                    Input
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-gray-950/80 p-2 font-mono text-[10px] text-gray-400">
                    {JSON.stringify(input, null, 2)}
                  </pre>
                </div>
              )}
              {output !== undefined && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                    Result
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-gray-950/80 p-2 font-mono text-[10px] text-gray-400">
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
