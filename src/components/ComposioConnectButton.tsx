'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_ROUTES } from '@/constants/api'

interface ComposioConnectButtonProps {
  provider: 'apollo' | 'outlook'
  isConnected: boolean
  onSuccess?: () => void
}

export function ComposioConnectButton({
  provider,
  isConnected,
  onSuccess,
}: ComposioConnectButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(API_ROUTES.composioAuthorize, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to get Connect Link')
      }

      const { redirectUrl } = (await res.json()) as { redirectUrl: string }
      window.open(redirectUrl, '_blank', 'noopener,noreferrer')

      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Connected
        </span>
        <span className="text-xs text-gray-500">
          Disconnect via Composio dashboard
        </span>
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
        {loading ? 'Opening…' : 'Connect'}
      </button>
      {provider === 'apollo' && (
        <span className="text-xs text-gray-500">
          You&apos;ll paste your API key from Apollo Settings
        </span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
