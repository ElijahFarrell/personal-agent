'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Film, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isFeatureEnabled } from '@/constants/featureGating'

export default function VideoStudioPage() {
  const { user } = useUser()
  const { config } = useOrgConfig()
  const enabled = isFeatureEnabled(config, 'videoStudio')

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const assets = useQuery(
    api.videoGeneration.listMediaByTenant,
    dbUser && enabled ? { tenantId: dbUser.tenantId, limit: 40 } : 'skip'
  )

  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, platformIntent: 'tiktok' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setMessage(data.message ?? 'Started.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  if (!enabled) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Video studio</CardTitle>
            <CardDescription>
              Not enabled for your organization. Contact your admin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Film className="h-7 w-7 text-muted-foreground" />
          Video studio
        </h1>
        <p className="text-muted-foreground">
          Generate short-form assets for TikTok and ads. Connect TikTok under Integrations to post when ready.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Create</CardTitle>
          <CardDescription>
            Describe the clip (style, subject, CTA). Requires{' '}
            <code className="text-xs">REPLICATE_API_TOKEN</code> on the server for real renders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vprompt">Prompt</Label>
            <Input
              id="vprompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="9:16 product demo, upbeat, end with logo…"
            />
          </div>
          <Button type="button" onClick={() => void generate()} disabled={loading || !prompt.trim()}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate
          </Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Library</h2>
        {!assets && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {assets && assets.length === 0 && (
          <p className="text-sm text-muted-foreground">No assets yet.</p>
        )}
        {assets && assets.length > 0 && (
          <ul className="space-y-2">
            {assets.map((a) => (
              <li key={a._id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">{a.platformIntent}</span>
                <span className="ml-2 text-muted-foreground">{a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
