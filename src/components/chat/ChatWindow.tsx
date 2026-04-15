'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  Fragment,
} from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { FileUIPart, UIMessage } from 'ai'
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
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input'
import { SkillPicker } from './SkillPicker'
import { ModelSelector } from './ModelSelector'
import { AgentMentionPopover } from './AgentMentionPopover'
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
import { SpeechInput } from '@/components/ai-elements/speech-input'
import { usePromptInputController } from '@/components/ai-elements/prompt-input'
import { ChartRenderer, type ChartSpec } from './ChartRenderer'
import { API_ROUTES } from '@/constants/api'
import { DEFAULT_CHAT_MODEL_ID, DEFAULT_CONTEXT_WINDOW } from '@/constants/models'
import { CHAT_LIMITS, CHAT_ROLES, CHAT_SOURCES } from '@/constants/chat'
import { AGENT_BY_ID, type AgentId } from '@/constants/agents'
import {
  Sparkles,
  X,
  Telescope,
  Mail,
  Calendar,
  Sunrise,
  Linkedin,
  Inbox,
  Users,
  Loader2,
  Paperclip,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { chatToolTitle } from '@/constants/chatToolUi'
import { CHAT_JOB_STATUS } from '@convex/constants'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AgentActivityStrip } from './AgentActivityStrip'
import {
  MessageActivityTrace,
  extractChartSpecsFromParts,
} from './MessageActivityTrace'
import { enrichUserMessageWithAttachments } from '@/utils/chat-attachments'

function isDataChatUiPart(part: { type: string }): boolean {
  return part.type === 'data-chat-phase' || part.type === 'data-chat-milestone'
}

function extractStreamUiHints(messages: UIMessage[]) {
  const last = messages.findLast((m) => m.role === CHAT_ROLES.ASSISTANT)
  if (!last?.parts) return { phase: null as string | null, milestone: null as string | null }
  let phase: string | null = null
  let milestone: string | null = null
  for (const part of last.parts) {
    if (!isDataChatUiPart(part as { type: string })) continue
    const p = part as { type: string; data?: { label?: string } }
    if (p.type === 'data-chat-phase' && p.data?.label) phase = p.data.label
    if (p.type === 'data-chat-milestone' && p.data?.label) milestone = p.data.label
  }
  return { phase, milestone }
}

function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith('tool-') || part.type === 'tool-invocation'
}

function mapToolState(state: string): 'input-available' | 'input-streaming' | 'output-available' | 'output-error' {
  if (state === 'output-error' || state === 'error') return 'output-error'
  if (state === 'result' || state === 'output-available') return 'output-available'
  if (state === 'call' || state === 'partial-call') return 'input-streaming'
  return 'input-available'
}

/** Voice input button — must render inside PromptInputProvider to access setInput. */
function VoiceInputButton() {
  const controller = usePromptInputController()
  const handleTranscription = useCallback(
    (text: string) => {
      controller.textInput.setInput(
        (controller.textInput.value ? controller.textInput.value + ' ' : '') + text
      )
    },
    [controller]
  )

  const handleAudioRecorded = useCallback(async (blob: Blob): Promise<string> => {
    const form = new FormData()
    form.append('audio', blob)
    const res = await fetch(API_ROUTES.voiceTranscribe, { method: 'POST', body: form })
    const data = await res.json()
    return data.text ?? ''
  }, [])

  return (
    <SpeechInput
      size="icon"
      variant="ghost"
      className="size-8 shrink-0"
      onTranscriptionChange={handleTranscription}
      onAudioRecorded={handleAudioRecorded}
    />
  )
}

/** Renders attachment chips above the composer; must be inside PromptInput. */
function ChatAttachmentPreview() {
  const attachments = usePromptInputAttachments()
  if (attachments.files.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-white/5 px-3 pb-1.5 pt-2">
      {attachments.files.map((f) => (
        <Badge
          key={f.id}
          variant="secondary"
          className="max-w-[min(100%,14rem)] gap-1 pr-1 text-xs font-normal"
        >
          <span className="truncate">{f.filename ?? 'file'}</span>
          <button
            type="button"
            className="rounded-sm p-0.5 hover:bg-muted"
            onClick={() => attachments.remove(f.id)}
            aria-label={`Remove ${f.filename ?? 'file'}`}
          >
            <X className="size-3 shrink-0" />
          </button>
        </Badge>
      ))}
    </div>
  )
}

/** Paperclip opens the file picker; must be inside PromptInput. */
function ChatAttachButton() {
  const attachments = usePromptInputAttachments()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground"
          aria-label="Attach files"
          onClick={() => attachments.openFileDialog()}
        >
          <Paperclip className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        Attach images, PDF, DOCX, or text/code files. Excel: paste or use workspace.
      </TooltipContent>
    </Tooltip>
  )
}

interface ChatWindowProps {
  threadId: Id<'threads'> | null
  onThreadCreated?: (threadId: Id<'threads'>) => void
  /** Pre-select @mention target (e.g. Meta Ads page). */
  initialTargetAgent?: AgentId | null
  /** Hide agent picker and lock badge when true. */
  lockTargetAgent?: boolean
}

export function ChatWindow({
  threadId,
  onThreadCreated,
  initialTargetAgent = null,
  lockTargetAgent = false,
}: ChatWindowProps) {
  const { user } = useUser()

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )
  const convexMessages = useQuery(
    api.messages.getMessagesByThreadId,
    threadId ? { threadId } : 'skip'
  )
  const latestChatJob = useQuery(
    api.chatJobs.getLatestForThread,
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
  const userAgentSettings = useQuery(
    api.userAgentSettings.getByUserId,
    dbUser ? { userId: dbUser._id } : 'skip'
  )

  const [pinnedSkillIds, setPinnedSkillIds] = useState<Set<string>>(new Set())
  const [cumulativeUsage, setCumulativeUsage] = useState({
    inputTokens: 0,
    outputTokens: 0,
  })
  const [activeSkills, setActiveSkills] = useState<
    Array<{ id: string; name: string; score: number }>
  >([])
  const [creditError, setCreditError] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [targetAgent, setTargetAgent] = useState<AgentId | null>(initialTargetAgent ?? null)
  const [deepResearch, setDeepResearch] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>('auto')
  const [runInBackground, setRunInBackground] = useState(false)
  const [bgJobRunning, setBgJobRunning] = useState(false)
  const bgJobIdRef = useRef<string | null>(null)
  const activeThreadRef = useRef<Id<'threads'> | null>(threadId)
  const targetAgentRef = useRef<AgentId | null>(null)
  const inputAreaRef = useRef<HTMLDivElement>(null)
  const pendingThreadIdRef = useRef<Id<'threads'> | null>(null)
  const flushedThreadRef = useRef(false)
  if (!pendingThreadIdRef.current) {
    activeThreadRef.current = threadId
  }

  const historyLoaded = threadId ? convexMessages !== undefined : true

  const agentInstructionsRef = useRef<Record<string, string> | undefined>(undefined)
  useEffect(() => {
    const fromConvex = userAgentSettings?.instructionsByAgentId
    if (fromConvex && Object.keys(fromConvex).length > 0) {
      agentInstructionsRef.current = fromConvex
      return
    }
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
  }, [userAgentSettings])

  const pinnedSkillIdsRef = useRef(pinnedSkillIds)
  pinnedSkillIdsRef.current = pinnedSkillIds
  targetAgentRef.current = targetAgent
  const deepResearchRef = useRef(deepResearch)
  deepResearchRef.current = deepResearch
  /** Captured per send for assistant message metadata (time savings). */
  const lastChatRequestMetaRef = useRef<{
    deepResearch: boolean
    targetAgent: AgentId | null
  }>({ deepResearch: false, targetAgent: null })
  const selectedModelRef = useRef(selectedModel)
  selectedModelRef.current = selectedModel

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
          deepResearch: deepResearchRef.current || undefined,
          model:
            selectedModelRef.current !== 'auto'
              ? selectedModelRef.current
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

  const { phase: phaseHint, milestone: milestoneHint } = useMemo(
    () => extractStreamUiHints(chatMessages),
    [chatMessages]
  )

  const activeToolLabels = useMemo(() => {
    const last = chatMessages.findLast((m) => m.role === CHAT_ROLES.ASSISTANT)
    if (!last?.parts) return [] as string[]
    const labels: string[] = []
    for (const part of last.parts) {
      if (!isToolPart(part as { type: string })) continue
      const p = part as { type: string; toolInvocation?: Record<string, unknown> }
      const inv = p.toolInvocation ?? part
      const toolName = p.type.startsWith('tool-')
        ? p.type.slice(5)
        : (inv as { toolName?: string }).toolName ?? 'unknown'
      const state = (inv as { state?: string }).state ?? 'output-available'
      const mapped = mapToolState(state)
      if (mapped !== 'input-available' && mapped !== 'input-streaming') continue
      const fullToolId = p.type.startsWith('tool-') ? p.type : `tool-${toolName}`
      labels.push(chatToolTitle(fullToolId))
    }
    return [...new Set(labels)]
  }, [chatMessages])

  useEffect(() => {
    if (!latestChatJob || !bgJobIdRef.current) return
    if (latestChatJob._id !== bgJobIdRef.current) return
    if (latestChatJob.status === CHAT_JOB_STATUS.FAILED && latestChatJob.error) {
      setChatError(latestChatJob.error)
    }
    if (
      latestChatJob.status === CHAT_JOB_STATUS.COMPLETED ||
      latestChatJob.status === CHAT_JOB_STATUS.FAILED
    ) {
      bgJobIdRef.current = null
      setBgJobRunning(false)
    }
  }, [latestChatJob])

  useEffect(() => {
    if (!isLoading || runInBackground) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isLoading, runInBackground])

  const streamBusy = isLoading || bgJobRunning

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
    setRunInBackground(false)
    setBgJobRunning(false)
    bgJobIdRef.current = null
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
    async (rawText: string, attachmentFiles: FileUIPart[]) => {
      if (!dbUser || streamBusy) return
      const trimmed = rawText.trim()
      if (!trimmed && attachmentFiles.length === 0) return

      const enriched = await enrichUserMessageWithAttachments(rawText, attachmentFiles)
      if (!enriched.ok) {
        setChatError(enriched.error)
        return
      }
      const { enrichedText, imageFiles } = enriched

      setCreditError(false)
      setChatError(null)

      let activeThreadId = activeThreadRef.current
      const isNewThread = !activeThreadId

      const titleBase = trimmed || 'Attachment'
      if (isNewThread) {
        const title = titleBase.length > 50 ? titleBase.slice(0, 50) + '…' : titleBase
        activeThreadId = await createThread({
          userId: dbUser._id,
          tenantId: dbUser.tenantId,
          title,
        })
        activeThreadRef.current = activeThreadId

        fetch(API_ROUTES.threadSummarize, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: titleBase }),
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
        content: enrichedText,
        threadId: activeThreadId!,
      })

      lastChatRequestMetaRef.current = {
        deepResearch: deepResearchRef.current,
        targetAgent: targetAgentRef.current,
      }

      const persistedCount = convexMessages?.length ?? 0
      if (persistedCount === 0 && !isNewThread) {
        const title = titleBase.length > 50 ? titleBase.slice(0, 50) + '…' : titleBase
        await updateThreadTitle({ threadId: activeThreadId!, title })
      }

      const imageAttachmentUrls = imageFiles.map((f) => f.url).filter(Boolean)

      if (runInBackground) {
        try {
          const res = await fetch(API_ROUTES.chat, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              message: enrichedText,
              attachmentUrls:
                imageAttachmentUrls.length > 0 ? imageAttachmentUrls : undefined,
              threadId: activeThreadId!,
              background: true,
              agentInstructions: agentInstructionsRef.current,
              targetAgent: targetAgentRef.current ?? undefined,
              deepResearch: deepResearchRef.current || undefined,
              model:
                selectedModelRef.current !== 'auto'
                  ? selectedModelRef.current
                  : undefined,
            }),
          })
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
            jobId?: string
          }
          if (!res.ok) {
            const msg = data.error ?? 'Background request failed'
            if (res.status === 402 || msg.includes('credits')) setCreditError(true)
            else setChatError(msg)
            return
          }
          if (data.jobId) {
            bgJobIdRef.current = data.jobId
            setBgJobRunning(true)
          }
        } catch (e) {
          setChatError(e instanceof Error ? e.message : 'Network error')
        }
        setTargetAgent(null)
        if (isNewThread) {
          pendingThreadIdRef.current = activeThreadId!
        }
        return
      }

      sendMessage({
        text: enrichedText,
        ...(imageFiles.length > 0 ? { files: imageFiles } : {}),
      })
      setTargetAgent(null)

      if (isNewThread) {
        pendingThreadIdRef.current = activeThreadId!
      }
    },
    [
      dbUser,
      streamBusy,
      runInBackground,
      createThread,
      saveMessage,
      updateThreadTitle,
      convexMessages?.length,
      sendMessage,
    ]
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

    const reqMeta = lastChatRequestMetaRef.current
    const assistantMeta =
      toolCallParts.length > 0 ||
      reqMeta.deepResearch ||
      reqMeta.targetAgent
        ? {
            ...(toolCallParts.length > 0 ? { toolCalls: toolCallParts } : {}),
            ...(reqMeta.deepResearch ? { deepResearch: true as const } : {}),
            ...(reqMeta.targetAgent ? { targetAgent: reqMeta.targetAgent } : {}),
          }
        : undefined

    void saveMessage({
      userId: dbUser._id,
      tenantId: dbUser.tenantId,
      role: CHAT_ROLES.ASSISTANT,
      source: CHAT_SOURCES.WEB,
      content: fullText,
      threadId: activeThreadRef.current,
      metadata: assistantMeta,
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
      handleSend(formatted, [])
    },
    [handleSend]
  )

  const SUGGESTED_PROMPTS: Array<{ text: string; icon: LucideIcon }> = [
    { text: 'Check my email', icon: Mail },
    { text: "What's on my calendar today?", icon: Calendar },
    { text: 'Brief me on my day', icon: Sunrise },
    { text: 'Draft a LinkedIn post', icon: Linkedin },
    { text: 'Summarize my inbox priorities', icon: Inbox },
    { text: 'Surface leads ready for follow-up', icon: Users },
  ]

  if (!historyLoaded) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-hidden px-6 py-8 sm:px-8">
          <div className="mx-auto max-w-4xl flex flex-col gap-4">
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
        <ConversationContent className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
          {displayMessages.length === 0 && !isStreaming && !isLoading ? (
            <ConversationEmptyState
              className="flex-1 py-12"
              title="Your AI Operating System"
              description="Tell me what you need. I'll coordinate AI agents to scout, analyze, and get things done."
              icon={
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
              }
            >
              <div className="mt-4 flex w-full justify-center">
                <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map(({ text, icon: Icon }) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => handleSend(text, [])}
                      disabled={!dbUser || creditError || streamBusy}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                      <span>&quot;{text}&quot;</span>
                    </button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {displayMessages.map((msg, index) => {
                const partsLoose = msg.parts as
                  | Array<Record<string, unknown>>
                  | undefined
                const chartSpecs = extractChartSpecsFromParts(partsLoose)
                const next = displayMessages[index + 1]
                const isLastMsg = index === displayMessages.length - 1
                const showBusyStripAfterUser =
                  streamBusy &&
                  msg.role === CHAT_ROLES.USER &&
                  (next?.role === CHAT_ROLES.ASSISTANT || isLastMsg)

                return (
                  <Fragment key={msg.id}>
                    <Message from={msg.role}>
                      <MessageContent className="text-sm">
                        {msg.role === 'user' ? (
                          <MessageResponse>{msg.content}</MessageResponse>
                        ) : (
                          <>
                            <MessageActivityTrace
                              parts={partsLoose}
                              isStreaming={
                                'isStreaming' in msg && Boolean(msg.isStreaming)
                              }
                            />
                            <AssistantMessageContent
                              content={msg.content}
                              isStreaming={
                                'isStreaming' in msg && msg.isStreaming
                              }
                              onQuestionAnswer={handleQuestionAnswer}
                            />
                            {chartSpecs.map((spec, i) => (
                              <ChartRenderer
                                key={`chart-${msg.id}-${i}`}
                                spec={spec}
                              />
                            ))}
                          </>
                        )}
                      </MessageContent>
                    </Message>
                    {showBusyStripAfterUser && (
                      <div className="w-full max-w-4xl self-stretch">
                        <AgentActivityStrip
                          visible
                          variant="dock"
                          showToolBadges={false}
                          phase={phaseHint}
                          milestone={milestoneHint}
                          isStreaming={isStreaming}
                          isSubmitted={status === 'submitted'}
                          activeToolLabels={activeToolLabels}
                          backgroundJob={bgJobRunning}
                        />
                      </div>
                    )}
                  </Fragment>
                )
              })}
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

      {isLoading && !runInBackground && (
        <div
          className="mx-auto flex max-w-4xl items-center justify-center gap-2 px-4 pb-2 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
          <span>Streaming… Closing this tab may interrupt the reply.</span>
        </div>
      )}

      <div ref={inputAreaRef} className="px-4 pb-3 pt-2 sm:px-6">
        <PromptInputProvider>
          <div
            className={cn(
              'mx-auto max-w-4xl rounded-2xl border border-white/8 bg-card/40 shadow-lg backdrop-blur-md',
              'transition-shadow duration-200 hover:shadow-xl'
            )}
          >
            <PromptInput
              accept="image/*,text/*,.pdf,.doc,.docx,.csv,.json,.md,.ts,.tsx,.js,.jsx,.mjs,.cjs,.py,.yaml,.yml,.html,.htm,.css,.xml,.sh,.sql"
              multiple
              maxFiles={8}
              onSubmit={async ({ text, files }) => {
                await handleSend(text, files)
              }}
              className="[&_[data-slot=input-group]]:!bg-transparent [&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:border-white/10"
            >
              <ChatAttachmentPreview />
              <PromptInputTextarea placeholder="Send a message…" />
              {!lockTargetAgent && (
                <AgentMentionPopover anchorRef={inputAreaRef} onSelect={setTargetAgent} />
              )}
              <PromptInputFooter>
                <PromptInputTools className="min-w-0 flex-1 flex-wrap gap-2">
                  <ChatAttachButton />
                  {targetAgent && (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                      @{AGENT_BY_ID.get(targetAgent)?.displayName ?? targetAgent}
                      {!lockTargetAgent && (
                        <button
                          type="button"
                          onClick={() => setTargetAgent(null)}
                          className="rounded p-0.5 hover:bg-muted"
                          aria-label="Clear agent"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={deepResearch ? 'default' : 'ghost'}
                        size="icon"
                        className={cn(
                          'size-8 shrink-0',
                          deepResearch &&
                            'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                        )}
                        onClick={() => setDeepResearch((v) => !v)}
                        aria-label="Toggle deep research"
                        aria-pressed={deepResearch}
                      >
                        <Telescope />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {deepResearch ? 'Deep Research on' : 'Deep Research'}
                    </TooltipContent>
                  </Tooltip>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground"
                        aria-label="More tools: skills, context, background run"
                      >
                        <SlidersHorizontal />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="top"
                      className="flex w-[min(100vw-2rem,20rem)] max-h-[min(70vh,28rem)] flex-col gap-4 overflow-y-auto"
                    >
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Skills &amp; context
                        </p>
                        <SkillPicker
                          skills={tenantSkills}
                          pinnedIds={pinnedSkillIds}
                          onToggle={handleToggleSkill}
                        />
                        <Context
                          usedTokens={
                            cumulativeUsage.inputTokens + cumulativeUsage.outputTokens
                          }
                          maxTokens={DEFAULT_CONTEXT_WINDOW}
                          modelId={
                            selectedModel === 'auto'
                              ? DEFAULT_CHAT_MODEL_ID
                              : selectedModel
                          }
                        >
                          <ContextTrigger className="h-8 w-full justify-start px-2 text-xs" />
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
                      </div>
                      <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="chat-bg"
                            checked={runInBackground}
                            onCheckedChange={setRunInBackground}
                            disabled={streamBusy}
                          />
                          <Label
                            htmlFor="chat-bg"
                            className="cursor-pointer text-sm leading-snug text-muted-foreground"
                          >
                            Continue in background
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Finish the reply after you leave this tab.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </PromptInputTools>
                <div className="flex shrink-0 items-center gap-1">
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  <VoiceInputButton />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PromptInputSubmit
                        status={status}
                        onStop={stop}
                        disabled={!dbUser || creditError || streamBusy}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs text-muted-foreground">
                      AI can make mistakes. Destructive actions always require confirmation.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </PromptInputFooter>
            </PromptInput>
          </div>
        </PromptInputProvider>
      </div>
    </div>
  )
}
