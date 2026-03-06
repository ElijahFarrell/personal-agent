'use client'

import { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QuestionBlock } from '@/lib/parseQuestions'

interface QuestionCardProps {
  question: QuestionBlock
  onAnswer: (labels: string[]) => void
}

export function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const handleSelect = useCallback(
    (optId: string, label: string) => {
      if (question.multiple) {
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(optId)) {
            next.delete(optId)
          } else {
            next.add(optId)
          }
          return next
        })
      } else {
        setSelected(new Set([optId]))
        onAnswer([label])
      }
    },
    [question.multiple, onAnswer]
  )

  const handleSubmit = useCallback(() => {
    const labels = question.options
      .filter((opt) => selected.has(opt.id))
      .map((opt) => opt.label)
    if (labels.length > 0) {
      onAnswer(labels)
    }
  }, [question.options, selected, onAnswer])

  return (
    <Card className="my-4 border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">
          {question.prompt}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div
          role={question.multiple ? 'group' : 'radiogroup'}
          aria-label={question.prompt}
          className="flex flex-col gap-1.5"
        >
          {question.options.map((opt) => {
            const isSelected = selected.has(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id, opt.label)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                  'hover:border-primary/40 hover:bg-accent/50',
                  isSelected
                    ? 'border-primary/50 bg-accent text-foreground'
                    : 'border-border bg-background/50 text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground'
                  )}
                >
                  {question.multiple ? (
                    isSelected ? (
                      <span className="text-[10px] font-bold">✓</span>
                    ) : null
                  ) : (
                    isSelected && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )
                  )}
                </span>
                <span className="flex-1 leading-relaxed">{opt.label}</span>
              </button>
            )
          })}
        </div>
        {question.multiple && (
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={selected.size === 0}
            className="mt-3"
          >
            Submit
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
