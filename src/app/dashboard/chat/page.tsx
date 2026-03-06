'use client'

import { useState, useCallback } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ThreadSidebar } from '@/components/chat/ThreadSidebar'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const [activeThreadId, setActiveThreadId] = useState<Id<'threads'> | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNewThread = useCallback(() => {
    setActiveThreadId(null)
  }, [])

  const handleThreadCreated = useCallback((threadId: Id<'threads'>) => {
    setActiveThreadId(threadId)
  }, [])

  return (
    <div className="relative flex h-full">
      <div className="relative flex-1 overflow-hidden">
        <ChatWindow
          threadId={activeThreadId}
          onThreadCreated={handleThreadCreated}
        />
      </div>

      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="absolute right-0 top-2 z-10 mr-2 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
        style={sidebarOpen ? { right: 320 } : undefined}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <PanelRightOpen className="h-4 w-4" />
        )}
      </button>

      <aside
        className={cn(
          'shrink-0 border-l border-gray-800/40 bg-gray-950/30 backdrop-blur-sm transition-[width] duration-200 ease-in-out overflow-hidden',
          sidebarOpen ? 'w-[320px]' : 'w-0 border-l-0'
        )}
      >
        <div className="w-[320px] h-full">
          <ThreadSidebar
            activeThreadId={activeThreadId}
            onSelectThread={setActiveThreadId}
            onNewThread={handleNewThread}
          />
        </div>
      </aside>
    </div>
  )
}
