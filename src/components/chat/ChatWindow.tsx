'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { SkillPicker } from './SkillPicker'
import type { ChatMessage } from './types'

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.[0] ?? ''
  const l = lastName?.[0] ?? ''
  return (f + l).toUpperCase() || 'U'
}

function toLocal(doc: {
  _id: string
  role: 'user' | 'assistant'
  source: 'web' | 'telegram'
  content: string
  createdAt: number
  metadata?: { route?: string }
}): ChatMessage {
  return {
    id: doc._id,
    role: doc.role,
    source: doc.source,
    content: doc.content,
    createdAt: doc.createdAt,
    route: doc.metadata?.route,
  }
}

interface ChatWindowProps {
  threadId: Id<'threads'> | null
  onThreadCreated?: (threadId: Id<'threads'>) => void
}

export function ChatWindow({ threadId, onThreadCreated }: ChatWindowProps) {
  const { user } = useUser()

  // ── Convex ───────────────────────────────────────────────────────────────
  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )
  const convexMessages = useQuery(
    api.messages.getMessagesByThreadId,
    threadId ? { threadId } : 'skip'
  )
  const saveMessage = useMutation(api.messages.saveMessage)
  const createThread = useMutation(api.threads.createThread)
  const updateThreadTitle = useMutation(api.threads.updateThreadTitle)
  const touchThread = useMutation(api.threads.touchThread)

  const tenantSkills = useQuery(
    api.skills.getAllSkillsForChat,
    dbUser ? { tenantId: dbUser.tenantId, userId: dbUser._id } : 'skip'
  )

  // ── Local streaming state ─────────────────────────────────────────────────
  const [pinnedSkillIds, setPinnedSkillIds] = useState<Set<string>>(new Set())
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [creditError, setCreditError] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  // Bridges the gap between streaming ending and Convex confirming the save,
  // preventing a flash where the completed message briefly disappears.
  const [pendingAssistant, setPendingAssistant] = useState<string | null>(null)
  const completedTextRef = useRef('')

  // ── Derived ───────────────────────────────────────────────────────────────
  const historyLoaded = threadId ? convexMessages !== undefined : true
  const isStreaming = isLoading && streamingContent.length > 0

  const persistedMessages: ChatMessage[] = (convexMessages ?? []).map(toLocal)

  // Clear pendingAssistant once Convex has confirmed the saved message
  useEffect(() => {
    if (!pendingAssistant) return
    if (persistedMessages.some((m) => m.role === 'assistant' && m.content === pendingAssistant)) {
      setPendingAssistant(null)
    }
  }, [persistedMessages, pendingAssistant])

  // While streaming: show persisted messages + live streaming bubble.
  // After streaming: show pendingAssistant (if Convex hasn't confirmed yet) to avoid
  // a flash between the streaming bubble disappearing and Convex pushing the saved message.
  // Once Convex confirms: show persisted messages only.
  const displayMessages: ChatMessage[] = isLoading
    ? [
        ...persistedMessages,
        {
          id: '__streaming__',
          role: 'assistant' as const,
          source: 'web' as const,
          content: streamingContent,
          createdAt: Date.now(),
          isStreaming: true,
        },
      ]
    : pendingAssistant &&
        !persistedMessages.some((m) => m.role === 'assistant' && m.content === pendingAssistant)
      ? [
          ...persistedMessages,
          {
            id: '__pending__',
            role: 'assistant' as const,
            source: 'web' as const,
            content: pendingAssistant,
            createdAt: Date.now(),
          },
        ]
      : persistedMessages

  const userInitials = getInitials(user?.firstName, user?.lastName)

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      if (!dbUser || isLoading) return

      setInput('')
      setIsLoading(true)
      setStreamingContent('')
      setPendingAssistant(null)
      setCreditError(false)
      completedTextRef.current = ''

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      let activeThreadId = threadId

      // Auto-create thread on first message if none exists
      if (!activeThreadId) {
        const title = text.length > 50 ? text.slice(0, 50) + '…' : text
        activeThreadId = await createThread({
          userId: dbUser._id,
          tenantId: dbUser.tenantId,
          title,
        })
        onThreadCreated?.(activeThreadId)
      }

      await saveMessage({
        userId: dbUser._id,
        tenantId: dbUser.tenantId,
        role: 'user',
        source: 'web',
        content: text,
        threadId: activeThreadId,
      })

      // Auto-title: update thread title from first user message
      if (persistedMessages.length === 0) {
        const title = text.length > 50 ? text.slice(0, 50) + '…' : text
        await updateThreadTitle({ threadId: activeThreadId, title })
      }

      try {
        // Read user-configured per-agent instructions saved from the Agents dashboard
        let agentInstructions: Record<string, string> | undefined
        try {
          const stored = localStorage.getItem('agent-custom-instructions')
          if (stored) {
            const parsed = JSON.parse(stored) as Record<string, string>
            const filtered = Object.fromEntries(
              Object.entries(parsed).filter(([, v]) => v?.trim())
            )
            if (Object.keys(filtered).length > 0) agentInstructions = filtered
          }
        } catch {
          // Silently ignore localStorage errors
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            threadId: activeThreadId,
            agentInstructions,
            pinnedSkillIds: pinnedSkillIds.size > 0 ? [...pinnedSkillIds] : undefined,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          if (response.status === 402) {
            setCreditError(true)
            return
          }
          const err = await response.json().catch(() => ({ error: 'Request failed' }))
          throw new Error(err.error ?? 'Request failed')
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
          setStreamingContent(fullText)
        }

        if (fullText) {
          // Store completed text in a ref so finally can batch-set it with the loading reset.
          // Fire-and-forget the Convex saves so they don't hold up the state reset —
          // this prevents Convex reacting and adding to persistedMessages while isLoading
          // is still true, which would cause a double-bubble.
          completedTextRef.current = fullText
          void saveMessage({
            userId: dbUser._id,
            tenantId: dbUser.tenantId,
            role: 'assistant',
            source: 'web',
            content: fullText,
            threadId: activeThreadId,
          })
          void touchThread({ threadId: activeThreadId })
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        console.error('[ChatWindow] Stream error:', err)

        const partial = streamingContent
        if (partial) {
          void saveMessage({
            userId: dbUser._id,
            tenantId: dbUser.tenantId,
            role: 'assistant',
            source: 'web',
            content: partial + '\n\n*(Response interrupted)*',
            threadId: activeThreadId,
          })
        }
      } finally {
        // Batch all state resets in one render. Setting pendingAssistant here (from the ref)
        // ensures there's no flash between the streaming bubble disappearing and Convex confirming.
        const completed = completedTextRef.current
        completedTextRef.current = ''
        if (completed) setPendingAssistant(completed)
        setIsLoading(false)
        setStreamingContent('')
        abortControllerRef.current = null
      }
    },
    [dbUser, isLoading, threadId, saveMessage, createThread, updateThreadTitle, touchThread, onThreadCreated, persistedMessages.length, streamingContent]
  )

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const handleToggleSkill = useCallback((skillId: string) => {
    setPinnedSkillIds((prev) => {
      const next = new Set(prev)
      if (next.has(skillId)) next.delete(skillId)
      else next.add(skillId)
      return next
    })
  }, [])

  const handleQuestionAnswer = useCallback(
    (questionId: string, labels: string[]) => {
      const formatted =
        labels.length === 1
          ? labels[0]
          : labels.map((l, i) => `${i + 1}. ${l}`).join('\n')
      handleSend(formatted)
    },
    [handleSend]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <MessageList
        messages={displayMessages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        userInitials={userInitials}
        historyLoaded={historyLoaded}
        onQuestionAnswer={handleQuestionAnswer}
      />

      {creditError && (
        <div className="mx-4 mb-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <span className="mt-0.5 text-base leading-none">✦</span>
          <div>
            <p className="font-medium">You&apos;ve run out of credits</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              Upgrade your plan or contact your admin to get more credits and keep chatting.
            </p>
          </div>
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        onStop={handleStop}
        isLoading={isLoading}
        disabled={!dbUser || creditError}
        extraControls={
          <SkillPicker
            skills={tenantSkills}
            pinnedIds={pinnedSkillIds}
            onToggle={handleToggleSkill}
          />
        }
      />
    </div>
  )
}
