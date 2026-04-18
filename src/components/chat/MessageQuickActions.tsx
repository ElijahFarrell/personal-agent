'use client'

import { Copy, ThumbsDown, ThumbsUp, RotateCcw } from 'lucide-react'
import { MessageActions, MessageAction } from '@/components/ai-elements/message'
import { cn } from '@/lib/utils'

export type MessageFeedback = 'up' | 'down' | null

interface MessageQuickActionsProps {
  /** Plain text to copy (markdown or raw user text). */
  copyText: string
  role: 'user' | 'assistant'
  feedback: MessageFeedback
  onFeedbackChange: (next: MessageFeedback) => void
  onCopy: () => void
  /** Assistant only: redo last reply. */
  onRegenerate?: () => void
  canRegenerate?: boolean
  disabled?: boolean
}

export function MessageQuickActions({
  copyText,
  role,
  feedback,
  onFeedbackChange,
  onCopy,
  onRegenerate,
  canRegenerate,
  disabled = false,
}: MessageQuickActionsProps) {
  const hasText = copyText.trim().length > 0

  return (
    <MessageActions
      className={cn(
        'mt-1 transition-opacity',
        'opacity-55 group-hover:opacity-100 group-focus-within:opacity-100',
        role === 'user' && 'justify-end self-end'
      )}
    >
      <MessageAction
        tooltip="Copy"
        label="Copy message"
        disabled={disabled || !hasText}
        onClick={onCopy}
        aria-label="Copy message"
      >
        <Copy className="size-3.5" />
      </MessageAction>
      <MessageAction
        tooltip={feedback === 'up' ? 'Remove upvote' : 'Good response'}
        label="Like message"
        disabled={disabled || !hasText}
        className={cn(feedback === 'up' && 'text-primary')}
        onClick={() =>
          onFeedbackChange(feedback === 'up' ? null : 'up')
        }
        aria-label="Good response"
        aria-pressed={feedback === 'up'}
      >
        <ThumbsUp className="size-3.5" />
      </MessageAction>
      <MessageAction
        tooltip={feedback === 'down' ? 'Remove downvote' : 'Bad response'}
        label="Dislike message"
        disabled={disabled || !hasText}
        className={cn(feedback === 'down' && 'text-destructive')}
        onClick={() =>
          onFeedbackChange(feedback === 'down' ? null : 'down')
        }
        aria-label="Bad response"
        aria-pressed={feedback === 'down'}
      >
        <ThumbsDown className="size-3.5" />
      </MessageAction>
      {role === 'assistant' && onRegenerate && (
        <MessageAction
          tooltip="Regenerate"
          label="Regenerate response"
          disabled={disabled || !canRegenerate}
          onClick={onRegenerate}
          aria-label="Regenerate response"
        >
          <RotateCcw className="size-3.5" />
        </MessageAction>
      )}
    </MessageActions>
  )
}
