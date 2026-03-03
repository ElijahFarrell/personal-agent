'use client'

import { useMemo } from 'react'
import { Zap, Bot } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { parseSources } from '@/lib/parseSources'
import { parseQuestions, type QuestionBlock } from '@/lib/parseQuestions'
import { SourceList } from './SourceList'
import { QuestionCard } from './QuestionCard'
import { ToolCallCard } from './ToolCallCard'
import type { ChatMessage } from './types'
import ReactMarkdown from 'react-markdown'

interface MessageBubbleProps {
  message: ChatMessage
  userInitials: string
  onQuestionAnswer?: (questionId: string, labels: string[]) => void
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatFullDate(ts: number): string {
  return new Date(ts).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith('tool-') || part.type === 'tool-invocation'
}

const MARKDOWN_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-white mt-5 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-white mt-4 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-white mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 ml-1 space-y-1 list-disc list-outside pl-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-1 space-y-1 list-decimal list-outside pl-4">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed pl-1">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-brand-500/40 pl-4 text-gray-300 italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline underline-offset-2 decoration-brand-400/30 hover:decoration-brand-300/50 transition-colors">
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-gray-200">{children}</em>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-xl bg-gray-950/80 p-4 font-mono text-[13px] text-gray-300 border border-gray-800/50">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-')
    return isBlock ? (
      <code className={className} {...props}>{children}</code>
    ) : (
      <code className="rounded-md bg-gray-800/70 px-1.5 py-0.5 font-mono text-[13px] text-brand-300" {...props}>
        {children}
      </code>
    )
  },
  hr: () => <hr className="my-4 border-gray-800/60" />,
}

export function MessageBubble({ message, userInitials, onQuestionAnswer }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isTelegram = message.source === 'telegram'

  const { content: withoutSources, sources } = useMemo(
    () => (isUser ? { content: message.content, sources: [] } : parseSources(message.content)),
    [message.content, isUser]
  )
  const { segments, questions } = useMemo(
    () => (isUser ? { segments: [message.content], questions: [] } : parseQuestions(withoutSources)),
    [withoutSources, isUser]
  )

  const toolParts = useMemo(() => {
    if (!message.parts || isUser) return []
    return message.parts.filter(isToolPart)
  }, [message.parts, isUser])

  if (isUser) {
    return (
      <TooltipProvider delayDuration={600}>
        <div className="group flex w-full gap-3 px-4 py-1.5 flex-row-reverse">
          <Avatar className="h-7 w-7 shrink-0 mt-0.5">
            <AvatarFallback className="bg-brand-600 text-white text-[10px] font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex max-w-[75%] flex-col gap-1 items-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-2xl rounded-tr-sm bg-brand-600 text-white shadow-lg shadow-brand-600/10 px-4 py-2.5 text-[15px] leading-relaxed">
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs text-gray-400 bg-gray-900 border-gray-700">
                {formatFullDate(message.createdAt)}
              </TooltipContent>
            </Tooltip>
            <span className="px-1 text-[10px] text-gray-600 text-right">
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delayDuration={600}>
      <div className="group flex w-full gap-3 px-4 py-2">
        <div className="flex h-7 w-7 shrink-0 mt-1 items-center justify-center rounded-full bg-brand-600/15 border border-brand-500/25">
          <Zap className="h-3.5 w-3.5 text-brand-400" aria-hidden />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {toolParts.length > 0 && (
            <div className="space-y-1 mb-1">
              {toolParts.map((part, i) => {
                const toolInv = part.toolInvocation ?? part
                const toolName = part.type.startsWith('tool-')
                  ? part.type
                  : (toolInv as { toolName?: string }).toolName ?? 'unknown'
                const state = (toolInv as { state?: string }).state ?? part.type
                const args = (toolInv as { args?: Record<string, unknown> }).args
                const result = (toolInv as { result?: unknown }).result ?? (toolInv as { output?: unknown }).output
                return (
                  <ToolCallCard
                    key={`${toolName}-${i}`}
                    toolName={toolName}
                    state={state}
                    input={args}
                    output={result}
                  />
                )
              })}
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'text-[15px] leading-[1.7] text-gray-100',
                  message.isStreaming && 'streaming-cursor',
                )}
              >
                {segments.map((segment, i) => {
                  if (typeof segment === 'string') {
                    if (!segment.trim()) return null
                    return (
                      <div key={i} className="max-w-none">
                        <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                          {segment}
                        </ReactMarkdown>
                      </div>
                    )
                  }
                  const q = segment as QuestionBlock
                  return (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      onAnswer={(labels) => onQuestionAnswer?.(q.id, labels)}
                    />
                  )
                })}
                {sources.length > 0 && <SourceList sources={sources} />}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs text-gray-400 bg-gray-900 border-gray-700">
              {formatFullDate(message.createdAt)}
            </TooltipContent>
          </Tooltip>

          <span className="px-1 text-[10px] text-gray-600">
            {isTelegram && <Bot className="inline h-2.5 w-2.5 mr-0.5" />}
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </TooltipProvider>
  )
}
