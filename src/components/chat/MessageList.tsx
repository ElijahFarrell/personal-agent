'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare } from 'lucide-react'
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
            className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-36'} bg-gray-800/60`}
          />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/10 border border-brand-600/20">
        <MessageSquare className="h-6 w-6 text-brand-400" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-gray-200">Start a conversation</p>
        <p className="text-sm text-gray-500 max-w-xs">
          Ask me anything — check email, research a topic, draft content, or just chat.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {[
          'Check my email',
          "What's on my calendar today?",
          'Brief me on my day',
          'Draft a LinkedIn post',
        ].map((prompt) => (
          <span
            key={prompt}
            className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs text-gray-400 cursor-default select-none"
          >
            {prompt}
          </span>
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
        <EmptyState />
      </div>
    )
  }

  // Build message list with date separators
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
      <div className="flex flex-col py-4">
        {items.map((item) => {
          if (item.type === 'separator') {
            return (
              <div key={item.key} className="flex items-center gap-3 px-4 py-3">
                <Separator className="flex-1 bg-gray-800/60" />
                <span className="text-[11px] font-medium text-gray-600 shrink-0">
                  {item.label}
                </span>
                <Separator className="flex-1 bg-gray-800/60" />
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

        {/* Typing indicator while waiting for first token */}
        {isLoading && !isStreaming && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  )
}
