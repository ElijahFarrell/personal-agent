'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Zap, Search, X, Pin } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SkillPickerItem {
  _id: string
  name: string
  description: string
  isEnabled: boolean
}

interface SkillPickerProps {
  skills: SkillPickerItem[] | undefined
  pinnedIds: Set<string>
  onToggle: (skillId: string) => void
}

export function SkillPicker({ skills, pinnedIds, onToggle }: SkillPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState<{ left: number; bottom: number } | null>(null)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPanelPos({
      left: rect.left,
      bottom: window.innerHeight - rect.top + 8,
    })
  }, [])

  useEffect(() => {
    if (!open) return

    updatePosition()

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  const enabledSkills = (skills ?? []).filter((s) => s.isEnabled)
  const filtered = enabledSkills.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
  })

  const panel = open && panelPos && createPortal(
    <div
      ref={panelRef}
      className="fixed z-50 w-72 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
      style={{ left: panelPos.left, bottom: panelPos.bottom }}
    >
      <div className="flex items-center justify-between border-b border-gray-800/60 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Pin className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-200">Pin Skills</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-0.5 text-gray-500 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {enabledSkills.length > 3 && (
        <div className="border-b border-gray-800/60 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search skills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-800 bg-gray-950/60 py-1.5 pl-7 pr-3 text-xs text-white placeholder-gray-600 outline-none focus:border-gray-600"
            />
          </div>
        </div>
      )}

      <div className="max-h-52 overflow-y-auto p-1.5">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-gray-600">
            {search ? 'No matching skills' : 'No enabled skills'}
          </p>
        ) : (
          filtered.map((skill) => {
            const isPinned = pinnedIds.has(skill._id)
            return (
              <button
                key={skill._id}
                type="button"
                onClick={() => onToggle(skill._id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                  isPinned
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'text-gray-300 hover:bg-gray-800/60'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                    isPinned
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-gray-600 bg-gray-900/80'
                  )}
                >
                  {isPinned && <Zap className="h-3 w-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{skill.name}</p>
                  <p className="truncate text-[10px] text-gray-500">{skill.description}</p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {pinnedIds.size > 0 && (
        <div className="border-t border-gray-800/60 px-3 py-2">
          <p className="text-[10px] text-gray-500">
            {pinnedIds.size} skill{pinnedIds.size > 1 ? 's' : ''} pinned — will be included in your next message
          </p>
        </div>
      )}
    </div>,
    document.body
  )

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
          pinnedIds.size > 0
            ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
        )}
        aria-label="Pin skills to context"
      >
        <Zap className="h-3.5 w-3.5" />
        {pinnedIds.size > 0 && (
          <span className="tabular-nums">{pinnedIds.size}</span>
        )}
      </button>

      {panel}
    </div>
  )
}
