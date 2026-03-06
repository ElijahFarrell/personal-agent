'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { AssistantMessageContent } from './AssistantMessageContent'
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool'
import {
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import { SkillPicker } from './SkillPicker'
import { ActiveSkillsCard } from './ActiveSkillsCard'
import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextTrigger,
} from '@/components/ai-elements/context'
import { API_ROUTES } from '@/constants/api'
import { DEFAULT_CONTEXT_WINDOW } from '@/constants/models'
import { CHAT_LIMITS, CHAT_ROLES, CHAT_SOURCES } from '@/constants/chat'
import { Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith('tool-') || part.type === 'tool-invocation'
}

function mapToolState(state: string): 'input-available' | 'input-streaming' | 'output-available' | 'output-error' {
  if (state === 'output-error' || state === 'error') return 'output-error'
  if (state === 'result' || state === 'output-available') return 'output-available'
  if (state === 'call' || state === 'partial-call') return 'input-streaming'
  return 'input-available'
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
  const [targetAgent, setTargetAgent] = useState<string | null>(null)
  const [cumulativeUsage, setCumulativeUsage] = useState({
    inputTokens: 0,
    outputTokens: 0,
  })
  const [activeSkills, setActiveSkills] = useState<
    Array<{ id: string; name: string; score: number }>
  >([])
  const [creditError, setCreditError] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const activeThreadRef = useRef<Id<'threads'> | null>(threadId)
  const pendingThreadIdRef = useRef<Id<'threads'> | null>(null)
  const flushedThreadRef = useRef(false)
  if (!pendingThreadIdRef.current) {
    activeThreadRef.current = threadId
  }

  const historyLoaded = threadId ? convexMessages !== undefined : true

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
  const targetAgentRef = useRef(targetAgent)
  targetAgentRef.current = targetAgent

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: API_ROUTES.chat,
        body: () => ({
          threadId: activeThreadRef.current,
          agentInstructions: agentInstructionsRef.current,
          pinnedSkillIds:
            pinnedSkillIdsRef.current.size > 0
              ? [...pinnedSkillIdsRef.current]
              : undefined,
          targetAgent: targetAgentRef.current ?? undefined,
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
      const timer = setTimeout(() => setChatError(null), CHAT_LIMITS.ERROR_DISMISS_MS)
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
    setCumulativeUsage({ inputTokens: 0, outputTokens: 0 })
    setActiveSkills([])
  }, [threadId, setMessages])

  useEffect(() => {
    let totalInput = 0
    let totalOutput = 0
    let latestSkills: Array<{ id: string; name: string; score: number }> = []
    for (const msg of chatMessages) {
      if (msg.role !== CHAT_ROLES.ASSISTANT || !msg.parts) continue
      for (const part of msg.parts) {
        const p = part as { type?: string; data?: Record<string, unknown> }
        if (p.type === 'data-usage' && p.data) {
          const d = p.data as { inputTokens?: number; outputTokens?: number }
          totalInput += d.inputTokens ?? 0
          totalOutput += d.outputTokens ?? 0
        }
        if (p.type === 'data-skills' && Array.isArray((p.data as { items?: unknown })?.items)) {
          const items = (p.data as { items: Array<{ id: string; name: string; score: number }> }).items
          latestSkills = items
            .filter((item) => item?.id && item?.name)
            .map((item) => ({
              id: item.id,
              name: item.name,
              score: typeof item.score === 'number' ? item.score : 0,
            }))
        }
      }
    }
    setCumulativeUsage({ inputTokens: totalInput, outputTokens: totalOutput })
    if (latestSkills.length > 0) setActiveSkills(latestSkills)
  }, [chatMessages])

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

    const lastAssistant = chatMessages.findLast((m) => m.role === CHAT_ROLES.ASSISTANT)
    const lastUser = chatMessages.findLast((m) => m.role === CHAT_ROLES.USER)

    const streamingMessages: Array<{
      id: string
      role: 'user' | 'assistant'
      source: 'web' | 'telegram'
      content: string
      createdAt: number
      route?: string
      isStreaming?: boolean
      parts?: NonNullable<typeof lastAssistant>['parts']
    }> = []

    if (lastUser) {
      const textPart = lastUser.parts?.find((p) => p.type === 'text')
      const userText = textPart && 'text' in textPart ? textPart.text : ''
      const alreadyPersisted = persisted.some(
        (m) => m.role === CHAT_ROLES.USER && m.content === userText
      )
      if (!alreadyPersisted && userText) {
        streamingMessages.push({
          id: lastUser.id,
          role: CHAT_ROLES.USER,
          source: CHAT_SOURCES.WEB,
          content: userText,
          createdAt: Date.now(),
        })
      }
    }

    if (lastAssistant) {
      const textParts = lastAssistant.parts?.filter((p) => p.type === 'text') ?? []
      const assistantText = textParts
        .map((p) => ('text' in p ? p.text : ''))
        .join('')
      const alreadyPersisted = persisted.some(
        (m) => m.role === CHAT_ROLES.ASSISTANT && m.content === assistantText
      )
      if (!alreadyPersisted) {
        streamingMessages.push({
          id: lastAssistant.id,
          role: CHAT_ROLES.ASSISTANT,
          source: CHAT_SOURCES.WEB,
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

        fetch(API_ROUTES.threadSummarize, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        })
          .then((r) => r.json())
          .then(({ title: summary }) => {
            if (summary) {
              updateThreadTitle({ threadId: activeThreadId!, title: summary })
            }
          })
          .catch(() => {})
      }

      await saveMessage({
        userId: dbUser._id,
        tenantId: dbUser.tenantId,
        role: CHAT_ROLES.USER,
        source: CHAT_SOURCES.WEB,
        content: text,
        threadId: activeThreadId!,
      })

      const persistedCount = convexMessages?.length ?? 0
      if (persistedCount === 0 && !isNewThread) {
        const title = text.length > 50 ? text.slice(0, 50) + '…' : text
        await updateThreadTitle({ threadId: activeThreadId!, title })
      }

      sendMessage({ text })
      setTargetAgent(null)

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

    const lastAssistant = chatMessages.findLast((m) => m.role === CHAT_ROLES.ASSISTANT)
    if (!lastAssistant) return

    const textParts = lastAssistant.parts?.filter((p) => p.type === 'text') ?? []
    const fullText = textParts.map((p) => ('text' in p ? p.text : '')).join('')
    if (!fullText) return

    const toolCallParts = lastAssistant.parts
      ?.filter((p) => p.type.startsWith('tool-') || p.type === 'tool-invocation')
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
      }) ?? []

    void saveMessage({
      userId: dbUser._id,
      tenantId: dbUser.tenantId,
      role: CHAT_ROLES.ASSISTANT,
      source: CHAT_SOURCES.WEB,
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

  const SUGGESTED_PROMPTS = [
    'Check my email',
    "What's on my calendar today?",
    'Brief me on my day',
    'Draft a LinkedIn post',
  ]

  if (!historyLoaded) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-hidden p-4">
          <div className="mx-auto max-w-4xl space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-3',
                  i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                )}
              >
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <Skeleton
                  className={cn(
                    'h-12 rounded-lg',
                    i % 2 === 0 ? 'w-48' : 'w-36'
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-4xl gap-6 px-4 py-6">
          {displayMessages.length === 0 && !isStreaming && !isLoading ? (
            <ConversationEmptyState
              title="Your AI Operating System"
              description="Tell me what you need. I'll coordinate AI agents to scout, analyze, and get things done."
              icon={
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
              }
            >
              <div className="mt-4 flex w-full justify-center">
                <div className="flex max-w-md flex-col gap-2 w-full">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    disabled={!dbUser || creditError}
                    className="rounded-lg border border-border bg-card px-4 py-3 text-left text-base text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
                  >
                    &quot;{prompt}&quot;
                  </button>
                ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {displayMessages.map((msg) => (
                <Message key={msg.id} from={msg.role}>
                  <MessageContent className="text-base">
                    {msg.role === 'user' ? (
                      <MessageResponse>{msg.content}</MessageResponse>
                    ) : (
                      <>
                        {msg.parts && msg.parts.filter(isToolPart).length > 0 && (
                          <div className="mb-4 space-y-2">
                            {msg.parts
                              .filter(isToolPart)
                              .map((part, i) => {
                                const inv = (part as { toolInvocation?: Record<string, unknown> }).toolInvocation ?? part
                                const toolName = part.type.startsWith('tool-')
                                  ? part.type.slice(5)
                                  : (inv as { toolName?: string }).toolName ?? 'unknown'
                                const state = (inv as { state?: string }).state ?? 'output-available'
                                const args = (inv as { args?: Record<string, unknown> }).args
                                const result = (inv as { result?: unknown }).result
                                const mappedState = mapToolState(state)
                                return (
                                  <Tool key={`${toolName}-${i}`}>
                                    <ToolHeader
                                      type="dynamic-tool"
                                      state={mappedState}
                                      toolName={toolName}
                                      title={toolName.replace(/([A-Z])/g, ' $1').trim()}
                                    />
                                    <ToolContent>
                                      {args && Object.keys(args).length > 0 && (
                                        <ToolInput input={args} />
                                      )}
                                      {(result !== undefined || state === 'output-error') && (
                                        <ToolOutput
                                          output={result}
                                          errorText={state === 'output-error' ? String(result ?? 'Error') : undefined}
                                        />
                                      )}
                                    </ToolContent>
                                  </Tool>
                                )
                              })}
                          </div>
                        )}
                        <AssistantMessageContent
                          content={msg.content}
                          isStreaming={'isStreaming' in msg && msg.isStreaming}
                          onQuestionAnswer={handleQuestionAnswer}
                        />
                      </>
                    )}
                  </MessageContent>
                </Message>
              ))}
              {isLoading && !isStreaming && (
                <Message from="assistant">
                  <MessageContent>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                      Thinking…
                    </div>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {chatError && (
        <div className="mx-4 mb-2">
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{chatError}</AlertDescription>
          </Alert>
        </div>
      )}

      {creditError && (
        <div className="mx-4 mb-2">
          <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTitle>You&apos;ve run out of credits</AlertTitle>
            <AlertDescription>
              Upgrade your plan or contact your admin to get more credits and keep chatting.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <PromptInputProvider>
          <PromptInput
            onSubmit={async ({ text }) => {
              if (text.trim()) await handleSend(text.trim())
            }}
            className="mx-auto max-w-4xl"
          >
            <PromptInputTextarea placeholder="Send a message…" />
            <PromptInputFooter>
              <PromptInputTools>
                <SkillPicker
                  skills={tenantSkills}
                  pinnedIds={pinnedSkillIds}
                  onToggle={handleToggleSkill}
                />
                <Context
                  usedTokens={cumulativeUsage.inputTokens + cumulativeUsage.outputTokens}
                  maxTokens={DEFAULT_CONTEXT_WINDOW}
                  modelId="anthropic/claude-sonnet-4-5"
                >
                  <ContextTrigger className="h-7 px-2 text-xs" />
                  <ContextContent>
                    <ContextContentHeader />
                    <ContextContentBody>
                      <ContextInputUsage />
                      <ContextOutputUsage />
                    </ContextContentBody>
                  </ContextContent>
                </Context>
                <ActiveSkillsCard
                  skills={activeSkills}
                  pinnedIds={pinnedSkillIds}
                  className="shrink-0"
                />
              </PromptInputTools>
              <PromptInputSubmit
                status={status}
                onStop={stop}
                disabled={!dbUser || creditError}
              />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </div>

      <p className="pb-2 text-center text-[10px] text-muted-foreground">
        AI can make mistakes. Destructive actions always require confirmation.
      </p>
    </div>
  )
}
