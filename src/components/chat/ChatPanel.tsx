'use client'

import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ChatWindow } from './ChatWindow'
import { useState, useCallback } from 'react'
import type { Id } from '@convex/_generated/dataModel'

interface ChatPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contextHint?: string
}

export function ChatPanel({ open, onOpenChange, contextHint }: ChatPanelProps) {
  const [activeThreadId, setActiveThreadId] = useState<Id<'threads'> | null>(null)

  const handleThreadCreated = useCallback((threadId: Id<'threads'>) => {
    setActiveThreadId(threadId)
  }, [])

  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[400px] flex-col gap-0 border-l border-white/10 p-0"
      >
        {contextHint && (
          <div className="shrink-0 border-b border-white/10 px-4 py-2 text-sm text-muted-foreground">
            {contextHint}
          </div>
        )}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <ChatWindow threadId={activeThreadId} onThreadCreated={handleThreadCreated} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
