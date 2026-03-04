'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { SkillPicker } from './SkillPicker'

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.[0] ?? ''
  const l = lastName?.[0] ?? ''
  return (f + l).toUpperCase() || 'U'
}

interface ChatWindowProps {
  threadId: Id<'threads'> | null
  onThreadCreated?: (threadId: Id<'threads'>) => void
}

export function ChatWindow({ threadId, onThreadCreated }: ChatWindowProps) {
  const { user } = useUser()

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

  const [pinnedSkillIds, setPinnedSkillIds] = useState<Set<string>>(new Set())
  const [input, setInput] = useState('')
  const [creditError, setCreditError] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const activeThreadRef = useRef<Id<'threads'> | null>(threadId)
  const pendingThreadIdRef = useRef<Id<'threads'> | null>(null)
  const flushedThreadRef = useRef(false)
  if (!pendingThreadIdRef.current) {
    activeThreadRef.current = threadId
  }

  const historyLoaded = threadId ? convexMessages !== undefined : true
  const userInitials = getInitials(user?.firstName, user?.lastName)

  const agentInstructionsRef = useRef<Record<string, string> | undefined>(undefined)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('agent-custom-instructions')
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string>
        const filtered = Object.fromEntries(
          Object.entries(parsed).filter(([, v]) => v?.trim())
        )
        if (Object.keys(filtered).length > 0) agentInstructionsRef.current = filtered
      }
    } catch {
      // ignore
    }
  }, [])

  const pinnedSkillIdsRef = useRef(pinnedSkillIds)
  pinnedSkillIdsRef.current = pinnedSkillIds

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: '/api/chat',
        body: () => ({
          threadId: activeThreadRef.current,
          agentInstructions: agentInstructionsRef.current,
          pinnedSkillIds:
            pinnedSkillIdsRef.current.size > 0
              ? [...pinnedSkillIdsRef.current]
              : undefined,
        }),
      }),
    [],
  )

  const {
    messages: chatMessages,
    sendMessage,
    status,
    error: useChatError,
    setMessages,
    stop,
  } = useChat({
    transport,
    id: threadId ?? 'new',
  })

  const isLoading = status === 'submitted' || status === 'streaming'
  const isStreaming = status === 'streaming'

  useEffect(() => {
    if (useChatError) {
      const msg = useChatError.message || 'Something went wrong'
      if (msg.includes('402') || msg.includes('credits')) {
        setCreditError(true)
      } else {
        setChatError(msg)
      }
    }
  }, [useChatError])

  useEffect(() => {
    if (chatError) {
      const timer = setTimeout(() => setChatError(null), 10000)
      return () => clearTimeout(timer)
    }
  }, [chatError])

  useEffect(() => {
    if (flushedThreadRef.current) {
      flushedThreadRef.current = false
      return
    }
    setMessages([])
    setCreditError(false)
    setChatError(null)
  }, [threadId, setMessages])

  /** Convert useChat messages to the format our MessageList/MessageBubble expect */
  const displayMessages = useMemo(() => {
    const persisted = (convexMessages ?? []).map((doc) => ({
      id: doc._id,
      role: doc.role as 'user' | 'assistant',
      source: doc.source as 'web' | 'telegram',
      content: doc.content,
      createdAt: doc.createdAt,
      route: doc.metadata?.route,
      parts: doc.metadata?.toolCalls?.map((tc) => ({
        type: tc.toolName,
        toolInvocation: {
          toolName: tc.toolName,
          state: tc.state,
          args: tc.args as Record<string, unknown> | undefined,
          result: tc.result,
        },
      })),
    }))

    if (!isLoading && chatMessages.length === 0) {
      return persisted
    }

    const lastAssistant = chatMessages.findLast((m) => m.role === 'assistant')
    const lastUser = chatMessages.findLast((m) => m.role === 'user')

    const streamingMessages: Array<{
      id: string
      role: 'user' | 'assistant'
      source: 'web' | 'telegram'
      content: string
      createdAt: number
      route?: string
      isStreaming?: boolean
      parts?: typeof lastAssistant extends undefined ? never : NonNullable<typeof lastAssistant>['parts']
    }> = []

    if (lastUser) {
      const textPart = lastUser.parts.find((p) => p.type === 'text')
      const userText = textPart && 'text' in textPart ? textPart.text : ''
      const alreadyPersisted = persisted.some(
        (m) => m.role === 'user' && m.content === userText
      )
      if (!alreadyPersisted && userText) {
        streamingMessages.push({
          id: lastUser.id,
          role: 'user',
          source: 'web',
          content: userText,
          createdAt: Date.now(),
        })
      }
    }

    if (lastAssistant) {
      const textParts = lastAssistant.parts.filter((p) => p.type === 'text')
      const assistantText = textParts
        .map((p) => ('text' in p ? p.text : ''))
        .join('')
      const alreadyPersisted = persisted.some(
        (m) => m.role === 'assistant' && m.content === assistantText
      )
      if (!alreadyPersisted) {
        streamingMessages.push({
          id: lastAssistant.id,
          role: 'assistant',
          source: 'web',
          content: assistantText,
          createdAt: Date.now(),
          isStreaming,
          parts: lastAssistant.parts,
        })
      }
    }

    return [...persisted, ...streamingMessages]
  }, [convexMessages, chatMessages, isLoading, isStreaming])

  const handleSend = useCallback(
    async (text: string) => {
      if (!dbUser || isLoading) return

      setInput('')
      setCreditError(false)
      setChatError(null)

      let activeThreadId = activeThreadRef.current
      const isNewThread = !activeThreadId

      if (isNewThread) {
        const title = text.length > 50 ? text.slice(0, 50) + '…' : text
        activeThreadId = await createThread({
          userId: dbUser._id,
          tenantId: dbUser.tenantId,
          title,
        })
        activeThreadRef.current = activeThreadId
      }

      await saveMessage({
        userId: dbUser._id,
        tenantId: dbUser.tenantId,
        role: 'user',
        source: 'web',
        content: text,
        threadId: activeThreadId!,
      })

      const persistedCount = convexMessages?.length ?? 0
      if (persistedCount === 0) {
        const title = text.length > 50 ? text.slice(0, 50) + '…' : text
        await updateThreadTitle({ threadId: activeThreadId!, title })
      }

      sendMessage({ text })

      if (isNewThread) {
        pendingThreadIdRef.current = activeThreadId!
      }
    },
    [dbUser, isLoading, createThread, saveMessage, updateThreadTitle, convexMessages?.length, sendMessage]
  )

  const prevStatusRef = useRef(status)
  useEffect(() => {
    const wasActive = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted'
    const nowReady = status === 'ready'
    prevStatusRef.current = status

    if (!wasActive || !nowReady) return
    if (!dbUser || !activeThreadRef.current) return

    const lastAssistant = chatMessages.findLast((m) => m.role === 'assistant')
    if (!lastAssistant) return

    const textParts = lastAssistant.parts.filter((p) => p.type === 'text')
    const fullText = textParts.map((p) => ('text' in p ? p.text : '')).join('')
    if (!fullText) return

    const toolCallParts = lastAssistant.parts
      .filter((p) => p.type.startsWith('tool-') || p.type === 'tool-invocation')
      .map((p) => {
        const inv = (p as { toolInvocation?: Record<string, unknown> }).toolInvocation ?? p
        return {
          toolName:
            p.type.startsWith('tool-')
              ? p.type
              : (inv as { toolName?: string }).toolName ?? 'unknown',
          state: (inv as { state?: string }).state ?? p.type,
          args: (inv as { args?: unknown }).args as Record<string, unknown> | undefined,
          result: (inv as { result?: unknown }).result ?? (inv as { output?: unknown }).output,
        }
      })

    void saveMessage({
      userId: dbUser._id,
      tenantId: dbUser.tenantId,
      role: 'assistant',
      source: 'web',
      content: fullText,
      threadId: activeThreadRef.current,
      metadata: toolCallParts.length > 0 ? { toolCalls: toolCallParts } : undefined,
    })
    void touchThread({ threadId: activeThreadRef.current })

    const hasPending = !!pendingThreadIdRef.current

    if (!hasPending) {
      setMessages([])
    }

    if (hasPending) {
      const pending = pendingThreadIdRef.current!
      pendingThreadIdRef.current = null
      flushedThreadRef.current = true
      onThreadCreated?.(pending)
    }
  }, [status, chatMessages, dbUser, saveMessage, touchThread, setMessages, onThreadCreated])

  const handleStop = useCallback(() => {
    stop()
  }, [stop])

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

  const handlePromptClick = useCallback(
    (prompt: string) => {
      handleSend(prompt)
    },
    [handleSend]
  )

  return (
    <div className="flex h-full flex-col">
      <MessageList
        messages={displayMessages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        userInitials={userInitials}
        historyLoaded={historyLoaded}
        onQuestionAnswer={handleQuestionAnswer}
        onPromptClick={handlePromptClick}
      />

      {chatError && (
        <div className="mx-4 mb-2 flex items-start gap-3 rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          <span className="mt-0.5 text-base leading-none">!</span>
          <div className="flex-1">
            <p className="font-medium">Something went wrong</p>
            <p className="mt-0.5 text-red-400/80">{chatError}</p>
          </div>
          <button
            onClick={() => setChatError(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {creditError && (
        <div className="mx-4 mb-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <span className="mt-0.5 text-base leading-none">&#10022;</span>
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
