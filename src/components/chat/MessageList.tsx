'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { ChatMessage } from './types'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  userInitials: string
  historyLoaded: boolean
  onQuestionAnswer?: (questionId: string, labels: string[]) => void
  onPromptClick?: (prompt: string) => void
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

function formatDateSeparator(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(ts, today.getTime())) return 'Today'
  if (isSameDay(ts, yesterday.getTime())) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`flex items-end gap-3 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
        >
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          <Skeleton
            className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-36'} bg-gray-800/40`}
          />
        </div>
      ))}
    </div>
  )
}

const SUGGESTED_PROMPTS = [
  'Check my email',
  "What's on my calendar today?",
  'Brief me on my day',
  'Draft a LinkedIn post',
]

function EmptyState({ onPromptClick }: { onPromptClick?: (prompt: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600/10 border border-brand-500/20">
          <Sparkles className="h-7 w-7 text-brand-400" />
        </div>
        <div className="absolute -inset-3 rounded-3xl bg-brand-500/5 blur-xl" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white tracking-tight">Your AI Operating System</h2>
        <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
          Tell me what you need. I&apos;ll coordinate AI agents to scout, analyze, and get things done.
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-2 w-full max-w-md">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPromptClick?.(prompt)}
            className="group rounded-xl border border-gray-800/80 bg-gray-900/40 backdrop-blur-sm px-4 py-3 text-left text-sm text-gray-400 transition-all hover:border-brand-600/40 hover:bg-gray-900/60 hover:text-gray-200"
          >
            <span className="text-gray-600 group-hover:text-brand-400">&quot;</span>{prompt}<span className="text-gray-600 group-hover:text-brand-400">&quot;</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function MessageList({
  messages,
  isLoading,
  isStreaming,
  userInitials,
  historyLoaded,
  onQuestionAnswer,
  onPromptClick,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  if (!historyLoaded) {
    return (
      <div className="flex-1 overflow-hidden">
        <LoadingSkeleton />
      </div>
    )
  }

  if (messages.length === 0 && !isStreaming && !isLoading) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <EmptyState onPromptClick={onPromptClick} />
      </div>
    )
  }

  const items: Array<{ type: 'message'; message: ChatMessage } | { type: 'separator'; label: string; key: string }> = []

  messages.forEach((msg, i) => {
    const prev = messages[i - 1]
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
      items.push({ type: 'separator', label: formatDateSeparator(msg.createdAt), key: `sep-${msg.id}` })
    }
    items.push({ type: 'message', message: msg })
  })

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-4xl flex flex-col py-6 px-2">
        {items.map((item) => {
          if (item.type === 'separator') {
            return (
              <div key={item.key} className="flex items-center gap-3 px-4 py-4">
                <Separator className="flex-1 bg-gray-800/40" />
                <span className="text-[11px] font-medium text-gray-600 shrink-0">
                  {item.label}
                </span>
                <Separator className="flex-1 bg-gray-800/40" />
              </div>
            )
          }
          return (
            <MessageBubble
              key={item.message.id}
              message={item.message}
              userInitials={userInitials}
              onQuestionAnswer={onQuestionAnswer}
            />
          )
        })}

        {isLoading && !isStreaming && <TypingIndicator />}

        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  )
}
