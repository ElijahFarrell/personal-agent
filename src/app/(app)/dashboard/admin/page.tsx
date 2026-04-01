'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  Coins,
  ChevronRight,
  Plus,
  Loader2,
  Search,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import { isSuperAdmin } from '@/middleware/adminGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminPage() {
  const { user } = useUser()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [search, setSearch] = useState('')

  const listData = useQuery(api.tenantConfigs.listAll)

  const isAdmin = isSuperAdmin(user?.id ?? null)

  const filteredResults = useMemo(() => {
    const results = listData ?? []
    if (!search.trim()) return results
    const q = search.trim().toLowerCase()
    return results.filter((r) =>
      r.tenant.name.toLowerCase().includes(q)
    )
  }, [listData, search])

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">
          You don&apos;t have access to this page.
        </p>
        <Link
          href="/dashboard"
          className="text-sm text-brand-400 hover:text-brand-300"
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  async function handleCreateOrg() {
    if (!newOrgName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName.trim(), trialDays: 7 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create org')
      setNewOrgName('')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to create org')
    } finally {
      setCreating(false)
    }
  }

  const results = listData ?? []

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/dashboard/admin"
            className="hover:text-foreground"
          >
            Admin
          </Link>
          <span>/</span>
          <span className="text-foreground">Organizations</span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Organizations
            </h1>
            <p className="mt-1 text-[15px] text-muted-foreground">
              Manage orgs, configs, and billing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search orgs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="New org name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
                className="w-40"
              />
              <Button
                onClick={handleCreateOrg}
                disabled={creating || !newOrgName.trim()}
                className="gap-2"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                New Org
              </Button>
            </div>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 py-16 text-center">
            <Building2 className="h-14 w-14 text-muted-foreground/50" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              No organizations yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create one using the form above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredResults.map(({ tenant, config, billing, memberCount }) => {
              const trialEndsAt =
                typeof billing?.trialEndsAt === 'number'
                  ? billing.trialEndsAt
                  : 0
              const isOnTrial =
                trialEndsAt > 0 && trialEndsAt > Date.now()
              const trialDays =
                trialEndsAt > 0
                  ? Math.ceil(
                      (trialEndsAt - Date.now()) /
                        (24 * 60 * 60 * 1000)
                    )
                  : 0
              const agentsCount =
                config?.allowedAgents === 'all'
                  ? 'all'
                  : Array.isArray(config?.allowedAgents)
                    ? config.allowedAgents.length
                    : 0

              return (
                <Link
                  key={tenant._id}
                  href={`/dashboard/admin/${tenant._id}`}
                  className="group block rounded-xl border border-border bg-card/50 p-5 transition-colors hover:border-border/80 hover:bg-card/80"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {tenant.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {String(config?.billingModel ?? '—')} · {memberCount}{' '}
                        members · {agentsCount} agents
                      </p>
                      <div className="mt-3 flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Coins className="h-4 w-4 text-violet-400" />
                          {billing?.unlimitedCredits
                            ? '∞'
                            : String(billing?.creditBalance ?? '—')}
                        </span>
                        {isOnTrial && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                            {trialDays}d trial
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {results.length > 0 && filteredResults.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No orgs match &quot;{search}&quot;
          </p>
        )}
      </div>
    </div>
  )
}
