'use client'

import { Zap, Loader2 } from 'lucide-react'

export function TypingIndicator() {
  return (
    <div className="flex w-full items-end gap-3 px-4 py-1.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600/15 border border-brand-500/25">
        <Zap className="h-3.5 w-3.5 text-brand-400" aria-hidden />
      </div>

      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-gray-900/70 backdrop-blur-sm border border-gray-800/80 px-4 py-2.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
        <span className="text-sm text-gray-400 animate-pulse">
          Understanding your request…
        </span>
      </div>
    </div>
  )
}
