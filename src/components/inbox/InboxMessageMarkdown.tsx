'use client'

import { MessageResponse } from '@/components/ai-elements/message'
import { cn } from '@/lib/utils'

type InboxMessageMarkdownProps = {
  text: string
  className?: string
  /** Tighter line height for dense inbox layouts */
  density?: 'default' | 'compact'
}

/**
 * Renders inbox body text as markdown (Streamdown) for lists, emphasis, code, links, etc.
 */
export function InboxMessageMarkdown({
  text,
  className,
  density = 'default',
}: InboxMessageMarkdownProps) {
  const safe = text.trim() || '—'
  return (
    <div
      className={cn(
        'text-foreground [&_a]:break-all [&_a]:text-primary [&_a]:underline [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-words',
        className
      )}
    >
      <MessageResponse
        className={cn(
          'text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
          density === 'compact' ? 'leading-snug' : 'leading-relaxed'
        )}
      >
        {safe}
      </MessageResponse>
    </div>
  )
}
