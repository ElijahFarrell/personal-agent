'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThreadSidebarProps {
  activeThreadId: Id<'threads'> | null
  onSelectThread: (threadId: Id<'threads'> | null) => void
  onNewThread: () => void
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ThreadSidebar({ activeThreadId, onSelectThread, onNewThread }: ThreadSidebarProps) {
  const { user } = useUser()

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )
  const threads = useQuery(
    api.threads.getThreadsByUserId,
    dbUser ? { userId: dbUser._id } : 'skip'
  )
  const updateTitle = useMutation(api.threads.updateThreadTitle)
  const deleteThread = useMutation(api.threads.deleteThread)
  const deleteAllThreads = useMutation(api.threads.deleteAllThreadsForUser)

  const [editingId, setEditingId] = useState<Id<'threads'> | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [threadToDelete, setThreadToDelete] = useState<Id<'threads'> | null>(null)
  const [showClearAllDialog, setShowClearAllDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleRename = useCallback(
    async (threadId: Id<'threads'>) => {
      const trimmed = editTitle.trim()
      if (trimmed) {
        await updateTitle({ threadId, title: trimmed })
      }
      setEditingId(null)
      setEditTitle('')
    },
    [editTitle, updateTitle]
  )

  const getNextThreadAfterDelete = useCallback(
    (deletedId: Id<'threads'>): Id<'threads'> | null => {
      const list = threads ?? []
      const idx = list.findIndex((t) => t._id === deletedId)
      if (idx < 0) return activeThreadId === deletedId ? null : activeThreadId
      if (activeThreadId !== deletedId) return activeThreadId
      if (idx < list.length - 1) return list[idx + 1]._id
      if (idx > 0) return list[idx - 1]._id
      return null
    },
    [threads, activeThreadId]
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!threadToDelete) return
    setIsDeleting(true)
    try {
      const nextId = getNextThreadAfterDelete(threadToDelete)
      await deleteThread({ threadId: threadToDelete })
      onSelectThread(nextId)
    } finally {
      setThreadToDelete(null)
      setIsDeleting(false)
    }
  }, [threadToDelete, deleteThread, getNextThreadAfterDelete, onSelectThread])

  const handleConfirmClearAll = useCallback(async () => {
    if (!dbUser) return
    setIsClearingAll(true)
    try {
      await deleteAllThreads({ userId: dbUser._id })
      onSelectThread(null)
    } finally {
      setShowClearAllDialog(false)
      setIsClearingAll(false)
    }
  }, [dbUser, deleteAllThreads, onSelectThread])

  const threadCount = threads?.length ?? 0

  return (
    <div className="flex h-full flex-col bg-sidebar border-l border-sidebar-border">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-sidebar-border">
        <span className="text-xs font-medium text-sidebar-foreground">Chats</span>
        <div className="flex items-center gap-0.5">
          <Button
            onClick={onNewThread}
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="New chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {threadCount > 0 ? (
            <Button
              onClick={() => setShowClearAllDialog(true)}
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Clear all"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-0.5 pb-3">
          {(threads ?? []).map((thread) => {
            const isActive = thread._id === activeThreadId
            const isEditing = editingId === thread._id

            return (
              <div
                key={thread._id}
                className="group relative flex items-center rounded-lg overflow-visible"
              >
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-1 px-2 py-1.5">
                    <input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(thread._id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground outline-none ring-1 ring-ring"
                    />
                    <button
                      onClick={() => handleRename(thread._id)}
                      className="rounded p-0.5 text-muted-foreground hover:text-green-500"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectThread(thread._id)}
                      className={cn(
                        'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 pr-20 text-left text-xs transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="flex-1 truncate">{thread.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(thread.updatedAt)}
                      </span>
                    </button>

                    <div
                      className={cn(
                        'absolute right-2 top-1/2 z-10 flex shrink-0 -translate-y-1/2 items-center gap-0.5 rounded-md border border-sidebar-border/60 bg-sidebar/95 p-0.5 shadow-sm backdrop-blur-sm transition-opacity',
                        isActive
                          ? 'opacity-100'
                          : 'opacity-70 hover:opacity-100'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setThreadToDelete(thread._id)}
                        className={cn(
                          'flex items-center justify-center rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                          isActive && 'text-sidebar-foreground'
                        )}
                        aria-label="Delete thread"
                        title="Delete thread"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center justify-center rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            aria-label="Thread actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditTitle(thread.title)
                              setEditingId(thread._id)
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setThreadToDelete(thread._id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {threads && threads.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No conversations yet
            </p>
          ) : null}
        </div>
      </ScrollArea>

      <Dialog open={!!threadToDelete} onOpenChange={(open) => !open && setThreadToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              This cannot be undone. All messages in this conversation will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setThreadToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear all conversations?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {threadCount} conversation
              {threadCount === 1 ? '' : 's'}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowClearAllDialog(false)}
              disabled={isClearingAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClearAll}
              disabled={isClearingAll}
            >
              {isClearingAll ? 'Clearing…' : 'Clear all'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
