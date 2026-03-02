'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { SourceCard } from './SourceCard'
import type { ParsedSource } from '@/lib/parseSources'

interface SourceListProps {
  sources: ParsedSource[]
}

const VISIBLE_COUNT = 4

export function SourceList({ sources }: SourceListProps) {
  const [expanded, setExpanded] = useState(false)

  if (sources.length === 0) return null

  const visible = expanded ? sources : sources.slice(0, VISIBLE_COUNT)
  const hiddenCount = sources.length - VISIBLE_COUNT

  return (
    <div className="mt-3 border-t border-gray-800/60 pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        <BookOpen className="h-3 w-3" />
        Sources ({sources.length})
      </div>

      <div className="flex flex-wrap gap-1.5">
        {visible.map((source, i) => (
          <SourceCard key={source.url} source={source} index={i} />
        ))}

        {hiddenCount > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 rounded-lg border border-gray-700/60 bg-gray-800/40 px-3 py-2 text-[11px] font-medium text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
          >
            +{hiddenCount} more
            <ChevronDown className="h-3 w-3" />
          </button>
        )}

        {expanded && sources.length > VISIBLE_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1 rounded-lg border border-gray-700/60 bg-gray-800/40 px-3 py-2 text-[11px] font-medium text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
          >
            Show less
            <ChevronUp className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
