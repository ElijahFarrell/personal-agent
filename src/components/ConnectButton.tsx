'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nango from '@nangohq/frontend'
import { API_ROUTES } from '@/constants/api'

interface ConnectButtonProps {
  integrationId: string
  provider: string
  isConnected: boolean
  onSuccess?: () => void
}

export function ConnectButton({
  integrationId,
  provider,
  isConnected,
  onSuccess,
}: ConnectButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(API_ROUTES.nangoSession, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to get session')
      }

      const { sessionToken } = (await res.json()) as { sessionToken: string }
      const nango = new Nango({ connectSessionToken: sessionToken })

      await nango.auth(integrationId)

      await fetch(API_ROUTES.nangoConfirm, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${integrationId}? You can reconnect later.`)) return

    setDisconnecting(true)
    setError(null)

    try {
      const res = await fetch(API_ROUTES.nangoDisconnect, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to disconnect')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setDisconnecting(false)
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Connected
        </span>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
        >
          {disconnecting ? 'Disconnecting…' : 'Disconnect'}
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        aria-busy={loading}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:opacity-50"
      >
        {loading ? 'Connecting…' : 'Connect'}
      </button>
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  )
}
