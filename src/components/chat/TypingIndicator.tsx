'use client'

import { Zap } from 'lucide-react'

export function TypingIndicator() {
  return (
    <div className="flex w-full items-end gap-3 px-4 py-1">
      {/* Agent avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600/20 border border-brand-600/30">
        <Zap className="h-3.5 w-3.5 text-brand-400" aria-hidden />
      </div>

      {/* Dots bubble */}
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-gray-900/80 border border-gray-800 px-4 py-3">
        <span
          className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce"
          style={{ animationDelay: '200ms', animationDuration: '1.2s' }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce"
          style={{ animationDelay: '400ms', animationDuration: '1.2s' }}
        />
      </div>
    </div>
  )
}
