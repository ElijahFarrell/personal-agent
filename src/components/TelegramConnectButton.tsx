'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { API_ROUTES } from '@/constants/api'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

interface TelegramConnectButtonProps {
  isConnected: boolean
  onSuccess?: () => void
}

export function TelegramConnectButton({
  isConnected: initialConnected,
  onSuccess,
}: TelegramConnectButtonProps) {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState<string | null>(null)
  const [awaitingLink, setAwaitingLink] = useState(false)
  const unlinkTelegramId = useMutation(api.users.unlinkTelegramId)

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user?.id ? { clerkUserId: user.id } : 'skip'
  )
  const isConnected = dbUser?.telegramId ? true : initialConnected

  useEffect(() => {
    if (awaitingLink && isConnected) {
      setAwaitingLink(false)
      setLinkUrl(null)
      onSuccess?.()
    }
  }, [awaitingLink, isConnected, onSuccess])

  async function handleConnect() {
    setLoading(true)
    setError(null)
    setLinkUrl(null)

    try {
      const res = await fetch(API_ROUTES.telegramLink, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to get link')
      }

      const { token, botUsername } = (await res.json()) as {
        token: string
        botUsername: string
      }
      const url = `https://t.me/${botUsername}?start=${token}`
      setLinkUrl(url)
      setAwaitingLink(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Telegram? You can reconnect later.')) return

    setDisconnecting(true)
    setError(null)

    try {
      if (!user?.id) throw new Error('Not authenticated')
      await unlinkTelegramId({ clerkUserId: user.id })
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
    <div className="flex flex-col items-end gap-1">
      {linkUrl ? (
        <div className="flex flex-col items-end gap-2">
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Open in Telegram
          </a>
          <span className="text-[11px] text-gray-500">
            Waiting for you to confirm in Telegram…
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          aria-busy={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Connect'}
        </button>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
