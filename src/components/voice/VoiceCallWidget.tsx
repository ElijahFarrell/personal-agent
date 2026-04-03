'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CALL_DIRECTION, CALL_LOG_PROVIDER, CALL_LOG_STATUS } from '@convex/constants'
import { Loader2, Mic, PhoneOff, X } from 'lucide-react'

type RetellClient = import('retell-client-js-sdk').RetellWebClient

interface VoiceCallWidgetProps {
  agentId?: string
  prospectId?: Id<'prospects'>
}

/**
 * In-dashboard voice call widget. Hidden by default — opens via the
 * `shiloh:start-call` custom event dispatched from other UI surfaces.
 */
export function VoiceCallWidget({ agentId, prospectId }: VoiceCallWidgetProps) {
  const { user } = useUser()
  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )
  const createCallLog = useMutation(api.callLogs.create)

  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lines, setLines] = useState<string[]>([])
  const [visible, setVisible] = useState(false)
  const linesRef = useRef<string[]>([])
  const clientRef = useRef<RetellClient | null>(null)
  const callIdRef = useRef<string | null>(null)

  const resolvedAgentId =
    agentId?.trim() ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RETELL_WEB_AGENT_ID) ||
    ''

  const stopCall = useCallback(() => {
    try {
      clientRef.current?.stopCall()
    } finally {
      clientRef.current = null
      setActive(false)
    }
  }, [])

  const dismiss = useCallback(() => {
    stopCall()
    setVisible(false)
    setError(null)
    setLines([])
    linesRef.current = []
  }, [stopCall])

  useEffect(() => {
    return () => {
      stopCall()
    }
  }, [stopCall])

  useEffect(() => {
    function handleStartCall(e: Event) {
      const detail = (e as CustomEvent).detail as {
        phone?: string
        prospectId?: string
      } | undefined
      if (detail?.phone) {
        setVisible(true)
      }
    }
    window.addEventListener('shiloh:start-call', handleStartCall)
    return () => window.removeEventListener('shiloh:start-call', handleStartCall)
  }, [])

  const startCall = async () => {
    if (!resolvedAgentId) {
      setError('Voice not configured — connect a voice provider in Integrations.')
      return
    }
    if (!dbUser) {
      setError('Sign in required.')
      return
    }
    setLoading(true)
    setError(null)
    linesRef.current = []
    setLines([])
    try {
      const res = await fetch('/api/voice/retell/web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: resolvedAgentId,
          ...(prospectId ? { prospectId } : {}),
        }),
      })
      const data = (await res.json()) as {
        accessToken?: string
        callId?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to create web call')
      }
      if (!data.accessToken) {
        throw new Error('Could not start voice session — try again')
      }
      callIdRef.current = data.callId ?? null

      const { RetellWebClient } = await import('retell-client-js-sdk')
      const client = new RetellWebClient()
      client.on('call_started', () => {
        setActive(true)
        linesRef.current = [...linesRef.current, '[Call started]']
        setLines([...linesRef.current])
      })
      client.on('call_ended', () => {
        linesRef.current = [...linesRef.current, '[Call ended]']
        setLines([...linesRef.current])
        setActive(false)
        void (async () => {
          const cid = callIdRef.current
          if (cid && dbUser) {
            try {
              await createCallLog({
                tenantId: dbUser.tenantId,
                userId: dbUser._id,
                prospectId,
                provider: CALL_LOG_PROVIDER.RETELL,
                externalCallId: cid,
                direction: CALL_DIRECTION.OUTBOUND,
                status: CALL_LOG_STATUS.ENDED,
                transcript: linesRef.current.join('\n'),
              })
            } catch (e) {
              console.warn('[VoiceCallWidget] callLogs.create', e)
            }
          }
        })()
      })
      client.on('error', (err: unknown) => {
        setError(typeof err === 'string' ? err : 'Call error')
        setActive(false)
      })
      client.on('update', (payload: unknown) => {
        const line = typeof payload === 'string' ? payload : JSON.stringify(payload)
        linesRef.current = [...linesRef.current, line]
        setLines([...linesRef.current])
      })

      await client.startCall({ accessToken: data.accessToken })
      clientRef.current = client
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start call')
    } finally {
      setLoading(false)
    }
  }

  if (!user || !visible) return null

  return (
    <Card className="border-violet-500/30 bg-zinc-950/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Mic className="h-4 w-4 text-violet-400" />
            AI voice
          </CardTitle>
          {!active && !loading && (
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-white"
              aria-label="Close voice panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void startCall()}
            disabled={loading || active || !resolvedAgentId}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mic className="mr-2 h-4 w-4" />
            )}
            Start call
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={stopCall}
            disabled={!active && !loading}
          >
            <PhoneOff className="mr-2 h-4 w-4" />
            Stop
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {lines.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {lines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
