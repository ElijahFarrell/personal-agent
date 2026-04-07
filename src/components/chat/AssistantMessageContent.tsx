'use client'

import { useMemo } from 'react'
import { MessageResponse } from '@/components/ai-elements/message'
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from '@/components/ai-elements/sources'
import { QuestionCard } from './QuestionCard'
import { parseSources } from '@/lib/parseSources'
import { parseQuestions, type QuestionBlock } from '@/lib/parseQuestions'
import { cn } from '@/lib/utils'

interface AssistantMessageContentProps {
  content: string
  isStreaming?: boolean
  onQuestionAnswer?: (questionId: string, labels: string[]) => void
}

export function AssistantMessageContent({
  content,
  isStreaming,
  onQuestionAnswer,
}: AssistantMessageContentProps) {
  const { segments, sources } = useMemo(() => {
    const { content: withoutSources, sources: parsedSources } =
      parseSources(content)
    const { segments: parsedSegments } = parseQuestions(withoutSources)
    return { segments: parsedSegments, sources: parsedSources }
  }, [content])

  return (
    <>
      {segments.map((segment, i) => {
        if (typeof segment === 'string') {
          if (!segment.trim()) return null
          return (
            <MessageResponse
              key={`text-${i}`}
              className={cn(
                'chat-assistant-markdown',
                isStreaming && 'streaming-cursor'
              )}
            >
              {segment}
            </MessageResponse>
          )
        }
        const question = segment as QuestionBlock
        return (
          <QuestionCard
            key={`q-${question.id}`}
            question={question}
            onAnswer={(labels) => onQuestionAnswer?.(question.id, labels)}
          />
        )
      })}
      {sources.length > 0 && (
        <Sources className="mt-4">
          <SourcesTrigger count={sources.length} />
          <SourcesContent className="flex flex-col gap-2">
            {sources.map((s) => (
              <Source key={s.url} href={s.url} title={s.title}>
                <img
                  src={s.favicon}
                  alt=""
                  className="h-4 w-4 shrink-0 rounded"
                />
                <span className="block truncate font-medium text-foreground">
                  {s.title}
                </span>
              </Source>
            ))}
          </SourcesContent>
        </Sources>
      )}
    </>
  )
}
