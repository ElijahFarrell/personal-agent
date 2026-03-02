'use client'

import { useState } from 'react'
import { Check, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuestionBlock } from '@/lib/parseQuestions'

interface QuestionCardProps {
  question: QuestionBlock
  onAnswer: (selectedLabels: string[]) => void
}

export function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  function handleSelect(optionId: string) {
    if (submitted) return

    setSelected((prev) => {
      const next = new Set(prev)
      if (question.multiple) {
        if (next.has(optionId)) next.delete(optionId)
        else next.add(optionId)
      } else {
        next.clear()
        next.add(optionId)
      }
      return next
    })
  }

  function handleSubmit() {
    if (selected.size === 0 || submitted) return
    setSubmitted(true)
    const labels = question.options
      .filter((o) => selected.has(o.id))
      .map((o) => o.label)
    onAnswer(labels)
  }

  function handleSingleSelect(optionId: string) {
    if (submitted) return
    if (!question.multiple) {
      setSelected(new Set([optionId]))
      setSubmitted(true)
      const label = question.options.find((o) => o.id === optionId)?.label
      if (label) onAnswer([label])
    } else {
      handleSelect(optionId)
    }
  }

  return (
    <div className="my-2 rounded-xl border border-gray-700/80 bg-gray-800/40 p-4">
      <p className="mb-3 text-sm font-medium text-gray-200">{question.prompt}</p>

      <div className="flex flex-col gap-1.5">
        {question.options.map((option) => {
          const isSelected = selected.has(option.id)
          return (
            <button
              key={option.id}
              type="button"
              disabled={submitted}
              onClick={() => handleSingleSelect(option.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                submitted && isSelected
                  ? 'border-brand-500/60 bg-brand-500/10 text-brand-300'
                  : submitted
                    ? 'border-gray-800 bg-gray-900/40 text-gray-600'
                    : isSelected
                      ? 'border-brand-500/60 bg-brand-500/10 text-white'
                      : 'border-gray-700/60 bg-gray-900/60 text-gray-300 hover:border-gray-600 hover:bg-gray-800/60 hover:text-white'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                  isSelected
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-gray-600 bg-gray-900/80'
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </span>
              <span className="flex-1">{option.label}</span>
            </button>
          )
        })}
      </div>

      {question.multiple && !submitted && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selected.size === 0}
          className="mt-3 flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="h-4 w-4" />
          Submit
        </button>
      )}

      {submitted && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
          <CheckCircle2 className="h-3 w-3 text-brand-400" />
          Answered
        </p>
      )}
    </div>
  )
}
