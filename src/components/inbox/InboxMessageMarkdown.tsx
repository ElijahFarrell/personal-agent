'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

type InboxMessageMarkdownProps = {
  text: string
  className?: string
  density?: 'default' | 'compact'
}

function linkifyText(text: string): (string | { type: 'link'; url: string; label: string })[] {
  const urlPattern = /(https?:\/\/[^\s<>()[\]"']+)/g
  const parts: (string | { type: 'link'; url: string; label: string })[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const url = match[1]
    let label: string
    try {
      const parsed = new URL(url)
      label = parsed.hostname.replace(/^www\./, '')
      if (parsed.pathname.length > 1) {
        const path = parsed.pathname.length > 30
          ? parsed.pathname.slice(0, 30) + '…'
          : parsed.pathname
        label += path
      }
    } catch {
      label = url.length > 50 ? url.slice(0, 50) + '…' : url
    }
    parts.push({ type: 'link', url, label })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

export function InboxMessageMarkdown({
  text,
  className,
  density = 'default',
}: InboxMessageMarkdownProps) {
  const raw = text.trim() || '—'

  const rendered = useMemo(() => {
    const paragraphs = raw.split(/\n{2,}/)

    return paragraphs.map((block, blockIdx) => {
      const lines = block.split('\n')

      return (
        <div key={blockIdx} className={blockIdx > 0 ? 'mt-3' : undefined}>
          {lines.map((line, lineIdx) => {
            const trimmed = line.trim()
            if (!trimmed) return null

            const parts = linkifyText(trimmed)

            return (
              <p
                key={lineIdx}
                className={cn(
                  'text-sm text-foreground',
                  density === 'compact' ? 'leading-relaxed' : 'leading-7',
                  lineIdx > 0 && 'mt-1'
                )}
              >
                {parts.map((part, i) => {
                  if (typeof part === 'string') {
                    return <span key={i}>{part}</span>
                  }
                  return (
                    <a
                      key={i}
                      href={part.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-sm bg-primary/8 px-1.5 py-0.5 text-xs font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:bg-primary/15 hover:decoration-primary/60"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="break-all">{part.label}</span>
                    </a>
                  )
                })}
              </p>
            )
          })}
        </div>
      )
    })
  }, [raw, density])

  return (
    <div className={cn('space-y-0', className)}>
      {rendered}
    </div>
  )
}
