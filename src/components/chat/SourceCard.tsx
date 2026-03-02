'use client'

import { ExternalLink } from 'lucide-react'
import type { ParsedSource } from '@/lib/parseSources'

interface SourceCardProps {
  source: ParsedSource
  index: number
}

export function SourceCard({ source, index }: SourceCardProps) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 rounded-lg border border-gray-700/80 bg-gray-800/60 px-3 py-2 text-xs transition-all hover:border-brand-500/60 hover:bg-gray-800"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-700/80 text-[10px] font-semibold text-gray-300">
        {index + 1}
      </span>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={source.favicon}
        alt=""
        width={14}
        height={14}
        className="shrink-0 rounded-sm"
        loading="lazy"
      />

      <span className="min-w-0 flex-1 truncate font-medium text-gray-200 group-hover:text-white">
        {source.title}
      </span>

      <span className="hidden shrink-0 text-[10px] text-gray-500 group-hover:inline">
        {source.domain}
      </span>

      <ExternalLink className="h-3 w-3 shrink-0 text-gray-600 group-hover:text-gray-400" />
    </a>
  )
}
