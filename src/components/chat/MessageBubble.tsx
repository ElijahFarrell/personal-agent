'use client'

import { useMemo } from 'react'
import { Zap, Send, Globe, Bot } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { parseSources } from '@/lib/parseSources'
import { parseQuestions, type QuestionBlock } from '@/lib/parseQuestions'
import { SourceList } from './SourceList'
import { QuestionCard } from './QuestionCard'
import type { ChatMessage } from './types'
import ReactMarkdown from 'react-markdown'

interface MessageBubbleProps {
  message: ChatMessage
  userInitials: string
  onQuestionAnswer?: (questionId: string, labels: string[]) => void
}

const ROUTE_LABELS: Record<string, string> = {
  email: 'Email',
  calendar: 'Calendar',
  linkedin: 'LinkedIn',
  content: 'Content',
  research: 'Research',
  instagram: 'Instagram',
  browser: 'Browser',
  orchestrator: 'AI OS',
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

  return (
    <TooltipProvider delayDuration={600}>
      <div
        className={cn(
          'group flex w-full gap-3 px-4 py-1',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {/* Avatar */}
        {isUser ? (
          <Avatar className="h-7 w-7 shrink-0 mt-0.5">
            <AvatarFallback className="bg-brand-600 text-white text-[10px] font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex h-7 w-7 shrink-0 mt-0.5 items-center justify-center rounded-full bg-brand-600/20 border border-brand-600/30">
            <Zap className="h-3.5 w-3.5 text-brand-400" aria-hidden />
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'flex max-w-[75%] flex-col gap-1',
            isUser ? 'items-end' : 'items-start'
          )}
        >
          {/* Source + route badges (assistant only) */}
          {!isUser && (
            <div className="flex items-center gap-1.5 px-0.5">
              {isTelegram && (
                <span className="flex items-center gap-1 text-[10px] text-blue-400">
                  <Send className="h-2.5 w-2.5" />
                  Telegram
                </span>
              )}
              {!isTelegram && (
                <span className="flex items-center gap-1 text-[10px] text-gray-600">
                  <Globe className="h-2.5 w-2.5" />
                  Web
                </span>
              )}
              {message.route && message.route !== 'orchestrator' && (
                <Badge
                  variant="outline"
                  className="h-4 px-1.5 py-0 text-[10px] border-gray-700 text-gray-500"
                >
                  {ROUTE_LABELS[message.route] ?? message.route}
                </Badge>
              )}
            </div>
          )}

          {/* Message content */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  isUser
                    ? 'rounded-tr-sm bg-brand-600 text-white'
                    : 'rounded-tl-sm bg-gray-900/80 border border-gray-800 text-gray-100',
                  message.isStreaming && !isUser && 'streaming-cursor'
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                ) : (
                  <>
                    {segments.map((segment, i) => {
                      if (typeof segment === 'string') {
                        if (!segment.trim()) return null
                        return (
                          <div key={i} className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_pre]:my-1.5 [&_code]:text-brand-300 [&_a]:text-brand-400 [&_strong]:text-white">
                            <ReactMarkdown
                              components={{
                                pre: ({ children }) => (
                                  <pre className="overflow-x-auto rounded-lg bg-gray-950 p-3 font-mono text-xs text-gray-300 border border-gray-800">
                                    {children}
                                  </pre>
                                ),
                                code: ({ className, children, ...props }) => {
                                  const isBlock = className?.includes('language-')
                                  return isBlock ? (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  ) : (
                                    <code
                                      className="rounded bg-gray-800 px-1 py-0.5 font-mono text-[11px] text-brand-300"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  )
                                },
                              }}
                            >
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
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side={isUser ? 'left' : 'right'}
              className="text-xs text-gray-400 bg-gray-900 border-gray-700"
            >
              {formatFullDate(message.createdAt)}
            </TooltipContent>
          </Tooltip>

          {/* Timestamp (always visible, subtle) */}
          <span className={cn('px-1 text-[10px] text-gray-600', isUser && 'text-right')}>
            {isTelegram && !isUser && <Bot className="inline h-2.5 w-2.5 mr-0.5" />}
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </TooltipProvider>
  )
}
