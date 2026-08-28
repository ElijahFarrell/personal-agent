'use client'

import { useState, useRef, useEffect, useId, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const WELCOME_MESSAGE =
  "Hi! I'm the Shiloh assistant. Ask me anything about our services, the free audit, or I can help connect you with our team."

function AssistantMessage({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc pl-4 last:mb-0 space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal pl-4 last:mb-0 space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
            {children}
          </code>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [sessionId] = useState(() => crypto.randomUUID())
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const a11yId = useId()

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/marketing-chat',
        body: { sessionId },
      }),
    [sessionId]
  )

  const { messages, sendMessage, status, error } = useChat({
    id: 'marketing-site-chat',
    transport,
  })
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!draft.trim() || isLoading) return
      sendMessage({ text: draft.trim() })
      setDraft('')
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!draft.trim() || isLoading) return
    sendMessage({ text: draft.trim() })
    setDraft('')
  }

  function extractText(msg: (typeof messages)[number]): string {
    if (Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('')
    }
    return ''
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-background shadow-lg shadow-brand-600/25 transition-all hover:scale-105 hover:bg-brand-700 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-labelledby={`${a11yId}-title`}
          className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/10 sm:w-96"
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100">
                <MessageCircle className="h-4 w-4 text-brand-600" />
              </div>
              <div>
                <h2
                  id={`${a11yId}-title`}
                  className="text-sm font-semibold text-foreground"
                >
                  Shiloh
                </h2>
                <p className="text-xs text-muted-foreground">Ask us anything</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3" ref={scrollRef}>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100">
                  <MessageCircle className="h-3 w-3 text-brand-600" />
                </div>
                <div className="rounded-xl rounded-tl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {WELCOME_MESSAGE}
                </div>
              </div>

              {messages.map((msg) => {
                const isUser = msg.role === 'user'
                const text = extractText(msg)
                if (!text) return null
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    {!isUser && (
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100">
                        <MessageCircle className="h-3 w-3 text-brand-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        isUser
                          ? 'rounded-tr-sm bg-brand-600 text-background'
                          : 'rounded-tl-sm bg-muted text-foreground'
                      }`}
                    >
                      {isUser ? text : <AssistantMessage text={text} />}
                    </div>
                  </div>
                )
              })}

              {isLoading && (
                <div className="flex gap-2">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100">
                    <MessageCircle className="h-3 w-3 text-brand-600" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm bg-muted px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  Something went wrong. Please try again.
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 border-t border-border px-3 py-3"
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message…"
              rows={1}
              className="max-h-24 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
              aria-label="Chat message"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !draft.trim()}
              className="h-9 w-9 shrink-0 rounded-lg bg-brand-600 text-background hover:bg-brand-700 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
