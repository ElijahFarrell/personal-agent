'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, MessageSquare, MoreHorizontal, Pencil, Trash2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThreadSidebarProps {
  activeThreadId: Id<'threads'> | null
  onSelectThread: (threadId: Id<'threads'>) => void
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

  const [editingId, setEditingId] = useState<Id<'threads'> | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<Id<'threads'> | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleDelete = useCallback(
    async (threadId: Id<'threads'>) => {
      setMenuOpenId(null)
      await deleteThread({ threadId })
    },
    [deleteThread]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3 pb-2">
        <Button
          onClick={onNewThread}
          variant="ghost"
          className="w-full justify-start gap-2 text-sm font-medium text-gray-300 hover:bg-gray-800/60 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-0.5 pb-3">
          {(threads ?? []).map((thread) => {
            const isActive = thread._id === activeThreadId
            const isEditing = editingId === thread._id
            const isMenuOpen = menuOpenId === thread._id

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
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded p-0.5 text-gray-400 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
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
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors cursor-pointer',
                      isActive
                        ? 'bg-brand-600/15 text-brand-300'
                        : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    <span className="flex-1 truncate">{thread.title}</span>
                    <span className="shrink-0 text-[10px] text-gray-600">
                      {formatRelativeTime(thread.updatedAt)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId(isMenuOpen ? null : thread._id)
                      }}
                      className="shrink-0 rounded p-0.5 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-gray-300"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {isMenuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-2 top-8 z-20 w-32 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl"
                  >
                    <button
                      onClick={() => {
                        setMenuOpenId(null)
                        setEditTitle(thread.title)
                        setEditingId(thread._id)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
                    >
                      <Pencil className="h-3 w-3" />
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(thread._id)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-gray-800"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {threads && threads.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-gray-600">
              No conversations yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
