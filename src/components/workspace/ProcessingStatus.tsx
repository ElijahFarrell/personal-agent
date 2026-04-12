'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WORKSPACE_DOC_STATUS } from '@convex/constants'

interface DocStatus {
  _id: string
  title: string
  status: string
  type: string
  processingError?: string
}

interface ProcessingStatusProps {
  docs: DocStatus[] | undefined
}

interface CompletedDoc {
  _id: string
  title: string
  status: 'ready' | 'error'
  processingError?: string
  completedAt: number
}

const COMPLETED_VISIBLE_MS = 4000

export function ProcessingStatus({ docs }: ProcessingStatusProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [completedDocs, setCompletedDocs] = useState<CompletedDoc[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const prevStatusRef = useRef<Map<string, string>>(new Map())

  const activeDocs = (docs ?? []).filter(
    (d) =>
      d.status === WORKSPACE_DOC_STATUS.PENDING ||
      d.status === WORKSPACE_DOC_STATUS.PROCESSING
  )

  useEffect(() => {
    if (!docs) return

    const prev = prevStatusRef.current
    const now = Date.now()

    for (const doc of docs) {
      const prevStatus = prev.get(doc._id)
      if (!prevStatus) continue

      const wasActive =
        prevStatus === WORKSPACE_DOC_STATUS.PENDING ||
        prevStatus === WORKSPACE_DOC_STATUS.PROCESSING

      if (wasActive && doc.status === WORKSPACE_DOC_STATUS.READY) {
        setCompletedDocs((c) => [
          ...c.filter((d) => d._id !== doc._id),
          { _id: doc._id, title: doc.title, status: 'ready', completedAt: now },
        ])
      } else if (wasActive && doc.status === WORKSPACE_DOC_STATUS.ERROR) {
        setCompletedDocs((c) => [
          ...c.filter((d) => d._id !== doc._id),
          {
            _id: doc._id,
            title: doc.title,
            status: 'error',
            processingError: doc.processingError,
            completedAt: now,
          },
        ])
      }
    }

    const next = new Map<string, string>()
    for (const doc of docs) {
      next.set(doc._id, doc.status)
    }
    prevStatusRef.current = next
  }, [docs])

  useEffect(() => {
    if (completedDocs.length === 0) return
    const timer = setInterval(() => {
      const cutoff = Date.now() - COMPLETED_VISIBLE_MS
      setCompletedDocs((c) => c.filter((d) => d.status === 'error' || d.completedAt > cutoff))
    }, 1000)
    return () => clearInterval(timer)
  }, [completedDocs.length])

  const visibleCompleted = completedDocs.filter((d) => !dismissed.has(d._id))
  const totalVisible = activeDocs.length + visibleCompleted.length
  if (totalVisible === 0) return null

  const handleDismiss = (id: string) => {
    setDismissed((s) => new Set(s).add(id))
    setCompletedDocs((c) => c.filter((d) => d._id !== id))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-1.5">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="bg-background border-border text-foreground flex items-center gap-2 self-end rounded-lg border px-3 py-2 text-sm shadow-lg"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
          {totalVisible} processing...
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      ) : (
        <>
          {totalVisible > 2 && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground flex items-center gap-1 self-end text-xs hover:underline"
            >
              Collapse <ChevronDown className="h-3 w-3" />
            </button>
          )}

          {activeDocs.map((doc) => (
            <div
              key={doc._id}
              className="bg-background border-border animate-in slide-in-from-right-5 flex items-center gap-2.5 rounded-lg border px-3 py-2.5 shadow-lg"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="text-muted-foreground text-xs capitalize">
                  {doc.status === 'pending' ? 'Queued' : 'Processing'} &middot; {doc.type}
                </p>
              </div>
            </div>
          ))}

          {visibleCompleted.map((doc) => (
            <div
              key={doc._id}
              className={cn(
                'bg-background border-border animate-in slide-in-from-right-5 flex items-center gap-2.5 rounded-lg border px-3 py-2.5 shadow-lg',
                doc.status === 'error' && 'border-destructive/30'
              )}
            >
              {doc.status === 'ready' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="text-destructive h-4 w-4 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                {doc.status === 'error' && doc.processingError ? (
                  <p className="text-destructive line-clamp-2 text-xs">
                    {doc.processingError}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">Done</p>
                )}
              </div>
              <button
                onClick={() => handleDismiss(doc._id)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
