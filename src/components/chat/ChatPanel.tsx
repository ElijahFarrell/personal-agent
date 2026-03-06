'use client'

import { useState, useCallback } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ChatWindow } from './ChatWindow'
import { cn } from '@/lib/utils'

export interface ChatPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional context hint for the current page (e.g. prospect name) */
  contextHint?: string
  className?: string
}

export function ChatPanel({
  open,
  onOpenChange,
  contextHint,
  className,
}: ChatPanelProps) {
  const [activeThreadId, setActiveThreadId] = useState<Id<'threads'> | null>(null)

  const handleThreadCreated = useCallback((threadId: Id<'threads'>) => {
    setActiveThreadId(threadId)
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col w-full sm:max-w-lg p-0 gap-0 border-l border-border bg-background',
          className
        )}
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-3">
          <SheetTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            AI Assistant
            {contextHint ? (
              <span className="text-xs font-normal text-muted-foreground truncate max-w-[200px]">
                — {contextHint}
              </span>
            ) : null}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ChatWindow
            threadId={activeThreadId}
            onThreadCreated={handleThreadCreated}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
