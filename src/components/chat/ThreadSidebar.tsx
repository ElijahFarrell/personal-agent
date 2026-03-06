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
    <div className="flex h-full flex-col bg-gray-950/40 backdrop-blur-sm">
      <div className="px-3 pt-3 pb-2 flex flex-col gap-2">
        <Button
          onClick={onNewThread}
          variant="ghost"
          className="w-full justify-start gap-2 rounded-xl text-sm font-semibold text-gray-200 hover:bg-brand-600/10 hover:text-white border border-transparent hover:border-brand-600/20 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        {threadCount > 0 ? (
          <Button
            onClick={() => setShowClearAllDialog(true)}
            variant="ghost"
            className="w-full justify-start gap-2 rounded-lg text-xs text-gray-500 hover:bg-gray-800/60 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </Button>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-0.5 pb-3">
          {(threads ?? []).map((thread) => {
            const isActive = thread._id === activeThreadId
            const isEditing = editingId === thread._id

            return (
              <div key={thread._id} className="group relative">
                {isEditing ? (
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(thread._id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-200 outline-none ring-1 ring-gray-600"
                    />
                    <button
                      onClick={() => handleRename(thread._id)}
                      className="rounded p-0.5 text-gray-400 hover:text-green-400"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded p-0.5 text-gray-400 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectThread(thread._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectThread(thread._id)
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors cursor-pointer',
                      isActive
                        ? 'bg-brand-600/15 text-brand-300'
                        : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    <span className="flex-1 truncate">{thread.title}</span>
                    <span className="shrink-0 text-xs text-gray-600">
                      {formatRelativeTime(thread.updatedAt)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 rounded p-0.5 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-gray-300"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditTitle(thread.title)
                            setEditingId(thread._id)
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setThreadToDelete(thread._id)
                          }}
                          className="text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )
          })}

          {threads && threads.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-gray-600">
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
