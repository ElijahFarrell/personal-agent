'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import Link from 'next/link'
import {
  MessageCircle,
  Loader2,
  Search,
  Mail,
  Phone,
  Building2,
  User,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import { isSuperAdmin } from '@/middleware/adminGuard'
import { Input } from '@/components/ui/input'

function formatDate(ts: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ts))
}

export default function AdminLeadsPage() {
  const { user } = useUser()
  const [search, setSearch] = useState('')

  const leads = useQuery(api.marketingChatLeads.listAll)
  const isAdmin = isSuperAdmin(user?.id ?? null)

  const filtered = useMemo(() => {
    const all = leads ?? []
    if (!search.trim()) return all
    const q = search.trim().toLowerCase()
    return all.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.useCase?.toLowerCase().includes(q)
    )
  }, [leads, search])

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
        <p className="text-muted-foreground">You don&apos;t have access to this page.</p>
        <Link href="/dashboard" className="text-sm text-brand-400 hover:text-brand-300">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/admin" className="hover:text-foreground">
            Admin
          </Link>
          <span>/</span>
          <span className="text-foreground">Website Leads</span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Website Leads
            </h1>
            <p className="mt-1 text-[15px] text-muted-foreground">
              Visitors who reached out via the chat widget.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 rounded-xl border border-border bg-card/50 px-5 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Total leads</p>
            <p className="text-lg font-semibold text-foreground">{leads?.length ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">With email</p>
            <p className="text-lg font-semibold text-foreground">
              {leads?.filter((l) => l.email).length ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">With phone</p>
            <p className="text-lg font-semibold text-foreground">
              {leads?.filter((l) => l.phone).length ?? '—'}
            </p>
          </div>
        </div>

        {leads === undefined ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 py-16 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              {search ? 'No leads match your search' : 'No leads yet'}
            </p>
            {!search && (
              <p className="mt-1 text-xs text-muted-foreground">
                Leads appear here when visitors chat on shiloh.sh.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/80">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Visitor
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                    Contact
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                    Use case
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((lead) => (
                  <tr
                    key={lead._id}
                    className="bg-card/30 transition-colors hover:bg-card/60"
                  >
                    {/* Visitor */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/15">
                          <User className="h-4 w-4 text-brand-400" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {lead.name || (
                              <span className="italic text-muted-foreground">
                                Anonymous
                              </span>
                            )}
                          </p>
                          {lead.company && (
                            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3 shrink-0" />
                              {lead.company}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="space-y-0.5">
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="flex items-center gap-1.5 text-brand-400 hover:text-brand-300"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </a>
                        )}
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{lead.phone}</span>
                          </a>
                        )}
                        {!lead.email && !lead.phone && (
                          <span className="text-xs italic text-muted-foreground">
                            No contact yet
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Use case */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      {lead.useCase ? (
                        <p className="line-clamp-2 max-w-xs text-muted-foreground">
                          {lead.useCase}
                        </p>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
