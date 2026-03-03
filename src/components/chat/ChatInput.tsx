'use client'

import { useRef, useState, useCallback, type KeyboardEvent, type ChangeEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUp, Square, Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_LENGTH = 4000
const MAX_ROWS = 5

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onStop?: () => void
  isLoading: boolean
  disabled?: boolean
  extraControls?: ReactNode
}

export function ChatInput({ value, onChange, onSubmit, onStop, isLoading, disabled, extraControls }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const valueRef = useRef(value)
  valueRef.current = value

  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = parseInt(getComputedStyle(el).lineHeight, 10) || 20
    const maxHeight = lineHeight * MAX_ROWS + 24
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (e.target.value.length > MAX_LENGTH) return
      onChange(e.target.value)
      autoResize()
    },
    [onChange, autoResize]
  )

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isLoading || disabled) return
    onSubmit(trimmed)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isLoading, disabled, onSubmit])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

        if (blob.size === 0) return

        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')

          const res = await fetch('/api/voice/transcribe', { method: 'POST', body: formData })
          const data = await res.json()

          if (data.text) {
            const current = valueRef.current
            const combined = current ? `${current} ${data.text}` : data.text
            onChange(combined.slice(0, MAX_LENGTH))
            autoResize()
          }
        } catch (err) {
          console.error('[Voice] Transcription error:', err)
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      console.error('[Voice] Microphone access denied:', err)
    }
  }, [onChange, autoResize])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    setIsRecording(false)
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const charsLeft = MAX_LENGTH - value.length
  const showCharCount = charsLeft < 500

  return (
    <div className="border-t border-gray-800/40 bg-gray-950/60 backdrop-blur-md px-4 py-3">
      <div className="mx-auto max-w-3xl relative flex items-end gap-2 rounded-2xl border border-gray-700/60 bg-gray-900/50 backdrop-blur-sm px-3 py-2 transition-all focus-within:border-brand-600/40 focus-within:ring-1 focus-within:ring-brand-600/20">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Send a message…"
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none border-0 bg-transparent p-0 text-sm text-gray-100 placeholder:text-gray-500',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            'min-h-[1.5rem] leading-relaxed'
          )}
          aria-label="Message input"
        />

        <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
          {extraControls}

          {showCharCount && (
            <span
              className={cn(
                'text-[10px] tabular-nums',
                charsLeft < 100 ? 'text-amber-500' : 'text-gray-600'
              )}
            >
              {charsLeft}
            </span>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={toggleRecording}
            disabled={disabled || isTranscribing}
            className={cn(
              'h-7 w-7 rounded-lg transition-all',
              isRecording
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 animate-pulse'
                : isTranscribing
                  ? 'text-brand-400 animate-pulse cursor-wait'
                  : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
            )}
            aria-label={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing…' : 'Start voice input'}
          >
            {isRecording ? (
              <MicOff className="h-3.5 w-3.5" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
          </Button>

          {isLoading && onStop ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={onStop}
              className="h-8 w-8 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              aria-label="Stop generation"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!value.trim() || isLoading || disabled}
              className={cn(
                'h-8 w-8 rounded-xl transition-all',
                value.trim() && !isLoading
                  ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/25'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              )}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-1.5 text-center text-[10px] text-gray-700">
        AI can make mistakes. Destructive actions always require confirmation.
      </p>
    </div>
  )
}
