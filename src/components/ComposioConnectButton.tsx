'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_ROUTES } from '@/constants/api'
import type { ComposioProvider } from '@/types'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ComposioConnectButtonProps {
  provider: ComposioProvider
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
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
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

  async function handleDisconnectConfirm() {
    setDisconnecting(true)
    setError(null)

    try {
      const res = await fetch(API_ROUTES.composioDisconnect, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        disconnected?: number
      }

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to disconnect')
      }

      if (data.disconnected === 0) {
        setError('No connection was found. Try refreshing the page.')
      }

      setConfirmOpen(false)
      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setDisconnecting(false)
    }
  }

  if (isConnected) {
    return (
      <>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setConfirmOpen(true)
              }}
              disabled={disconnecting}
              className="rounded-lg border border-gray-600 bg-transparent px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:bg-gray-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Remove the connection here, then use Connect again to re-authorize.
          </p>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="border-gray-800 bg-gray-900 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove connection?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This disconnects {provider} from your account in Composio. You can
                connect again afterward with the same or a different account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <button
                type="button"
                onClick={() => void handleDisconnectConfirm()}
                disabled={disconnecting}
                className="inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-50"
              >
                {disconnecting ? 'Removing…' : 'Remove connection'}
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
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
      {provider === 'lemlist' && (
        <span className="text-xs text-gray-500">
          Sign in with your Lemlist account to authorize outreach tools
        </span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
