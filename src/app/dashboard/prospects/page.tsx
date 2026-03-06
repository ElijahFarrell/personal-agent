'use client'

import { useState, useCallback, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import {
  Plus,
  Search,
  Trash2,
  X,
  Users,
  Linkedin,
  Globe,
  Mail,
  Phone,
  RefreshCw,
  FileText,
  Sparkles,
  Clock,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  Copy,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ProspectStatus, ProspectStage } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_META: Record<ProspectStatus, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-gray-500/10 text-gray-400' },
  researching: { label: 'Researching', color: 'bg-blue-500/10 text-blue-400' },
  draft_ready: { label: 'Draft Ready', color: 'bg-amber-500/10 text-amber-400' },
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-400' },
  sent: { label: 'Sent', color: 'bg-purple-500/10 text-purple-400' },
  replied: { label: 'Replied', color: 'bg-emerald-500/10 text-emerald-400' },
  archived: { label: 'Archived', color: 'bg-gray-500/10 text-gray-500' },
}

const STAGE_META: Record<ProspectStage, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  messaged: { label: 'Messaged', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  follow_up: { label: 'Follow Up', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  meeting_booked: { label: 'Meeting', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  interested: { label: 'Interested', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  dead: { label: 'Dead', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  deal_open: { label: 'Deal Open', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
}

const ALL_STATUSES = Object.keys(STATUS_META) as ProspectStatus[]
const ALL_STAGES = Object.keys(STAGE_META) as ProspectStage[]

type SortField = 'name' | 'company' | 'stage' | 'status' | 'updatedAt'
type SortDir = 'asc' | 'desc'
type OwnerFilter = 'all' | 'mine' | 'unassigned'

interface ProspectFormData {
  name: string
  company: string
  email: string
  phone: string
  linkedinUrl: string
  websiteUrl: string
  notes: string
}

const EMPTY_FORM: ProspectFormData = {
  name: '', company: '', email: '', phone: '', linkedinUrl: '', websiteUrl: '', notes: '',
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function ProspectsPage() {
  const { user } = useUser()

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | 'all'>('all')
  const [stageFilter, setStageFilter] = useState<ProspectStage | 'all'>('all')
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all')
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<ProspectFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Selection & detail
  const [selectedIds, setSelectedIds] = useState<Set<Id<'prospects'>>>(new Set())
  const [detailId, setDetailId] = useState<Id<'prospects'> | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<ProspectFormData & { stage: ProspectStage }>(
    { ...EMPTY_FORM, stage: 'new' }
  )

  // Actions
  const [deleting, setDeleting] = useState<Id<'prospects'> | null>(null)
  const [enriching, setEnriching] = useState<Set<Id<'prospects'>>>(new Set())
  const [draftAction, setDraftAction] = useState<string | null>(null)
  const [batchEnriching, setBatchEnriching] = useState(false)
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null)

  // Queries
  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const prospects = useQuery(
    api.prospects.getProspectsByTenantId,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const orgMembers = useQuery(
    api.users.getUsersByTenantId,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const selectedProspect = useQuery(
    api.prospects.getProspect,
    detailId ? { prospectId: detailId } : 'skip'
  )

  const selectedResearch = useQuery(
    api.prospects.getResearchSnapshot,
    detailId ? { prospectId: detailId } : 'skip'
  )

  const selectedDrafts = useQuery(
    api.prospects.getDraftsByProspect,
    detailId ? { prospectId: detailId } : 'skip'
  )

  const createProspect = useMutation(api.prospects.createProspect)
  const deleteProspectMut = useMutation(api.prospects.deleteProspect)
  const updateProspectMut = useMutation(api.prospects.updateProspect)

  // Member lookup map
  const memberMap = useMemo(() => {
    const map = new Map<string, { email: string }>()
    for (const m of orgMembers ?? []) {
      map.set(String(m._id), { email: m.email })
    }
    return map
  }, [orgMembers])

  // Filtered & sorted
  const filteredProspects = useMemo(() => {
    let list = prospects ?? []
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter)
    if (stageFilter !== 'all') list = list.filter((p) => (p as { stage?: string }).stage === stageFilter)
    if (ownerFilter === 'mine' && dbUser) list = list.filter((p) => String(p.ownerId) === String(dbUser._id))
    if (ownerFilter === 'unassigned') list = list.filter((p) => !p.ownerId)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.company ?? '').toLowerCase().includes(q) ||
          (p.email ?? '').toLowerCase().includes(q)
      )
    }

    const sorted = [...list]
    sorted.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''
      switch (sortField) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break
        case 'company': aVal = (a.company ?? '').toLowerCase(); bVal = (b.company ?? '').toLowerCase(); break
        case 'stage': aVal = (a as { stage?: string }).stage ?? ''; bVal = (b as { stage?: string }).stage ?? ''; break
        case 'status': aVal = a.status; bVal = b.status; break
        case 'updatedAt': aVal = a.updatedAt; bVal = b.updatedAt; break
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [prospects, statusFilter, stageFilter, ownerFilter, searchQuery, sortField, sortDir, dbUser])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3" />
      : <ChevronDown className="inline h-3 w-3" />
  }

  function toggleSelect(id: Id<'prospects'>) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredProspects.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProspects.map((p) => p._id)))
    }
  }

  function openCreateForm() {
    setFormData(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setFormData(EMPTY_FORM)
    setFormError('')
  }

  async function handleSave() {
    if (!formData.name.trim()) { setFormError('Name is required'); return }
    if (!dbUser) return
    setSaving(true)
    setFormError('')
    try {
      await createProspect({
        tenantId: dbUser.tenantId,
        ownerId: dbUser._id,
        name: formData.name.trim(),
        company: formData.company.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        linkedinUrl: formData.linkedinUrl.trim() || undefined,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        source: 'manual' as const,
        notes: formData.notes.trim() || undefined,
      })
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = useCallback(
    async (prospectId: Id<'prospects'>) => {
      if (!confirm('Delete this prospect and all related data?')) return
      setDeleting(prospectId)
      if (detailId === prospectId) setDetailId(null)
      try {
        await deleteProspectMut({ prospectId })
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(prospectId); return next })
      } catch (err) {
        console.error('[Prospects] Delete error:', err)
      } finally {
        setDeleting(null)
      }
    },
    [deleteProspectMut, detailId]
  )

  async function handleBatchDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected prospects?`)) return
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      try { await deleteProspectMut({ prospectId: id }) } catch { /* continue */ }
    }
    setSelectedIds(new Set())
    if (detailId && ids.includes(detailId)) setDetailId(null)
  }

  async function handleEnrich(prospectId: Id<'prospects'>) {
    setEnriching((prev) => new Set(prev).add(prospectId))
    try {
      const res = await fetch('/api/prospects/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId, channel: 'linkedin' }),
      })
      if (!res.ok) {
        const data = await res.json()
        console.error('[Prospects] Enrich failed:', data.error)
      }
    } catch (err) {
      console.error('[Prospects] Enrich error:', err)
    } finally {
      setEnriching((prev) => { const next = new Set(prev); next.delete(prospectId); return next })
    }
  }

  async function handleBatchEnrich() {
    setBatchEnriching(true)
    try {
      const ids = Array.from(selectedIds)
      const res = await fetch('/api/prospects/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectIds: ids, channel: 'linkedin' }),
      })
      if (!res.ok) {
        const data = await res.json()
        console.error('[Prospects] Batch enrich failed:', data.error)
      }
    } catch (err) {
      console.error('[Prospects] Batch enrich error:', err)
    } finally {
      setBatchEnriching(false)
    }
  }

  async function handleCrmSync(draftId: string) {
    setDraftAction(draftId)
    try {
      const res = await fetch('/api/prospects/drafts/crm-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      })
      if (!res.ok) console.error('[Prospects] CRM sync failed:', (await res.json()).error)
    } catch (err) {
      console.error('[Prospects] CRM sync error:', err)
    } finally {
      setDraftAction(null)
    }
  }

  async function handleDraftAction(draftId: string, action: 'approve' | 'reject' | 'send') {
    setDraftAction(draftId)
    try {
      const res = await fetch(`/api/prospects/drafts/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      })
      if (!res.ok) console.error(`[Prospects] Draft ${action} failed:`, (await res.json()).error)
    } catch (err) {
      console.error(`[Prospects] Draft ${action} error:`, err)
    } finally {
      setDraftAction(null)
    }
  }

  function startEditing() {
    if (!selectedProspect) return
    const sp = selectedProspect as typeof selectedProspect & { stage?: ProspectStage }
    setEditData({
      name: sp.name,
      company: sp.company ?? '',
      email: sp.email ?? '',
      phone: sp.phone ?? '',
      linkedinUrl: sp.linkedinUrl ?? '',
      websiteUrl: sp.websiteUrl ?? '',
      notes: sp.notes ?? '',
      stage: sp.stage ?? 'new',
    })
    setEditing(true)
  }

  async function handleEditSave() {
    if (!selectedProspect || !editData.name.trim()) return
    try {
      await updateProspectMut({
        prospectId: selectedProspect._id,
        name: editData.name.trim(),
        company: editData.company.trim() || undefined,
        email: editData.email.trim() || undefined,
        phone: editData.phone.trim() || undefined,
        linkedinUrl: editData.linkedinUrl.trim() || undefined,
        websiteUrl: editData.websiteUrl.trim() || undefined,
        notes: editData.notes.trim() || undefined,
        stage: editData.stage,
      })
      setEditing(false)
    } catch (err) {
      console.error('[Prospects] Edit save error:', err)
    }
  }

  async function handleStageChange(prospectId: Id<'prospects'>, stage: ProspectStage) {
    try {
      await updateProspectMut({ prospectId, stage })
    } catch (err) {
      console.error('[Prospects] Stage change error:', err)
    }
  }

  async function handleOwnerChange(prospectId: Id<'prospects'>, ownerId: string | null) {
    try {
      await updateProspectMut({
        prospectId,
        ownerId: ownerId ? (ownerId as Id<'users'>) : undefined,
      })
    } catch (err) {
      console.error('[Prospects] Owner change error:', err)
    }
  }

  async function handleCopyDraft(body: string, draftId: string) {
    await navigator.clipboard.writeText(body)
    setCopiedDraftId(draftId)
    setTimeout(() => setCopiedDraftId(null), 2000)
  }

  const isLoading = prospects === undefined

  // ─── Render ──────────────────────────────────────────────────────────────────

  const thClass = 'px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:text-gray-300 transition-colors'
  const tdClass = 'px-4 py-3 text-sm'

  return (
    <div className="flex min-w-0 flex-1 overflow-hidden">
      {/* Left: Table */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-gray-800/60">
        <div className="space-y-3 p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Prospects</h1>
              <p className="mt-1 text-[15px] text-gray-400">
                Research, personalize, and track outreach.
                {prospects && prospects.length > 0 && (
                  <span className="ml-1.5 tabular-nums text-gray-500">{prospects.length} total</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateForm}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Prospect
            </button>
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by name, company, or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-gray-900/50 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-gray-600 focus:ring-1 focus:ring-brand-500/50"
              />
            </div>

            {/* Owner filter */}
            <div className="flex rounded-lg border border-gray-800 bg-gray-900/50">
              {(['all', 'mine', 'unassigned'] as OwnerFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setOwnerFilter(f)}
                  className={`px-3 py-2 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                    ownerFilter === f ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'mine' ? 'Mine' : 'Unassigned'}
                </button>
              ))}
            </div>
          </div>

          {/* Status + Stage filter chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-800/40 text-gray-500 hover:text-gray-300'
              }`}
            >
              All Status
            </button>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s ? 'bg-gray-700 text-white' : 'bg-gray-800/40 text-gray-500 hover:text-gray-300'
                }`}
              >
                {STATUS_META[s].label}
              </button>
            ))}
            <span className="mx-1 self-center text-gray-700">|</span>
            <button
              type="button"
              onClick={() => setStageFilter('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                stageFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-800/40 text-gray-500 hover:text-gray-300'
              }`}
            >
              All Stages
            </button>
            {ALL_STAGES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStageFilter(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  stageFilter === s ? 'bg-gray-700 text-white' : 'bg-gray-800/40 text-gray-500 hover:text-gray-300'
                }`}
              >
                {STAGE_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Action Bar */}
        {selectedIds.size > 0 && (
          <div className="mx-5 mb-3 flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/80 px-4 py-2.5">
            <span className="text-sm font-medium text-white">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={handleBatchEnrich}
              disabled={batchEnriching}
              className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${batchEnriching ? 'animate-spin' : ''}`} />
              {batchEnriching ? 'Enriching…' : 'Research & Draft All'}
            </button>
            <button
              type="button"
              onClick={handleBatchDelete}
              className="rounded-md bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-600/30"
            >
              Delete Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-xs text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-brand-500" />
              <p className="text-sm text-gray-500">Loading…</p>
            </div>
          ) : !filteredProspects || filteredProspects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/60">
                <Users className="h-5 w-5 text-gray-600" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-gray-400">
                {searchQuery || statusFilter !== 'all' || stageFilter !== 'all' ? 'No matching prospects' : 'No prospects yet'}
              </p>
              <p className="text-xs text-gray-600">
                {searchQuery || statusFilter !== 'all' || stageFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Add your first prospect to get started with personalized outreach.'}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead className="sticky top-0 z-10 border-b border-gray-800/60 bg-gray-950">
                <tr>
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredProspects.length && filteredProspects.length > 0}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500/30"
                    />
                  </th>
                  <th className={thClass} onClick={() => toggleSort('name')}>Name <SortIcon field="name" /></th>
                  <th className={thClass} onClick={() => toggleSort('company')}>Company <SortIcon field="company" /></th>
                  <th className={thClass} onClick={() => toggleSort('stage')}>Stage <SortIcon field="stage" /></th>
                  <th className={thClass} onClick={() => toggleSort('status')}>Status <SortIcon field="status" /></th>
                  <th className={`${thClass} w-20`}>LinkedIn</th>
                  <th className={thClass}>Assigned To</th>
                  <th className={thClass} onClick={() => toggleSort('updatedAt')}>Updated <SortIcon field="updatedAt" /></th>
                  <th className={`${thClass} w-20`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {filteredProspects.map((prospect) => {
                  const sp = prospect as typeof prospect & { stage?: ProspectStage }
                  const stage = sp.stage ?? 'new'
                  const isSelected = selectedIds.has(prospect._id)
                  const isDetail = detailId === prospect._id
                  const owner = prospect.ownerId ? memberMap.get(String(prospect.ownerId)) : null

                  return (
                    <tr
                      key={prospect._id}
                      className={`transition-colors hover:bg-gray-800/20 ${isDetail ? 'bg-gray-800/30' : ''}`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(prospect._id)}
                          className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500/30"
                        />
                      </td>
                      <td
                        className={`${tdClass} cursor-pointer font-medium text-white`}
                        onClick={() => setDetailId(prospect._id)}
                      >
                        {prospect.name}
                      </td>
                      <td className={`${tdClass} text-gray-400`}>{prospect.company ?? '—'}</td>
                      <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={stage}
                          onChange={(e) => handleStageChange(prospect._id, e.target.value as ProspectStage)}
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${STAGE_META[stage].color} cursor-pointer bg-transparent outline-none`}
                        >
                          {ALL_STAGES.map((s) => (
                            <option key={s} value={s} className="bg-gray-900 text-gray-300">{STAGE_META[s].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className={tdClass}>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_META[prospect.status as ProspectStatus]?.color ?? ''}`}>
                          {STATUS_META[prospect.status as ProspectStatus]?.label ?? prospect.status}
                        </span>
                      </td>
                      <td className={tdClass}>
                        {prospect.linkedinUrl ? (
                          <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <Linkedin className="h-4 w-4 text-sky-500/70 hover:text-sky-400 transition-colors" />
                          </a>
                        ) : <span className="text-gray-700">—</span>}
                      </td>
                      <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={prospect.ownerId ? String(prospect.ownerId) : ''}
                          onChange={(e) => handleOwnerChange(prospect._id, e.target.value || null)}
                          className="max-w-[140px] truncate rounded-md border border-gray-800 bg-transparent px-1.5 py-0.5 text-xs text-gray-400 outline-none hover:border-gray-600 focus:border-brand-500"
                        >
                          <option value="" className="bg-gray-900">Unassigned</option>
                          {(orgMembers ?? []).map((m) => (
                            <option key={String(m._id)} value={String(m._id)} className="bg-gray-900">
                              {m.email}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`${tdClass} text-xs text-gray-500`}>
                        {new Date(prospect.updatedAt).toLocaleDateString()}
                      </td>
                      <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEnrich(prospect._id)}
                            disabled={enriching.has(prospect._id)}
                            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-brand-400 disabled:opacity-50"
                            title="Research & Draft"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${enriching.has(prospect._id) ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(prospect._id)}
                            disabled={deleting === prospect._id}
                            className="rounded p-1 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: Detail Panel */}
      <div className="hidden w-[440px] shrink-0 overflow-y-auto lg:block">
        {selectedProspect ? (
          <div className="space-y-6 p-6">
            {/* Detail Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {editing ? (
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800/60 px-2 py-1 text-lg font-semibold text-white outline-none focus:border-brand-500"
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-white">{selectedProspect.name}</h2>
                )}
                {editing ? (
                  <input
                    type="text"
                    value={editData.company}
                    onChange={(e) => setEditData((p) => ({ ...p, company: e.target.value }))}
                    placeholder="Company"
                    className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800/60 px-2 py-1 text-sm text-gray-300 outline-none focus:border-brand-500"
                  />
                ) : selectedProspect.company ? (
                  <p className="mt-0.5 text-sm text-gray-400">{selectedProspect.company}</p>
                ) : null}
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_META[selectedProspect.status as ProspectStatus]?.color ?? ''}`}>
                    {STATUS_META[selectedProspect.status as ProspectStatus]?.label ?? selectedProspect.status}
                  </span>
                  {editing ? (
                    <select
                      value={editData.stage}
                      onChange={(e) => setEditData((p) => ({ ...p, stage: e.target.value as ProspectStage }))}
                      className={`rounded-md border px-2 py-0.5 text-xs font-medium ${STAGE_META[editData.stage].color} cursor-pointer bg-transparent outline-none`}
                    >
                      {ALL_STAGES.map((s) => (
                        <option key={s} value={s} className="bg-gray-900 text-gray-300">{STAGE_META[s].label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${STAGE_META[((selectedProspect as typeof selectedProspect & { stage?: ProspectStage }).stage ?? 'new') as ProspectStage].color}`}>
                      {STAGE_META[((selectedProspect as typeof selectedProspect & { stage?: ProspectStage }).stage ?? 'new') as ProspectStage].label}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleEditSave}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-500"
                    >
                      <Check className="h-3.5 w-3.5" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400 transition-colors hover:text-white"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startEditing}
                      className="rounded-lg border border-gray-700 p-2 text-gray-500 transition-colors hover:border-gray-600 hover:text-white"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEnrich(selectedProspect._id)}
                      disabled={enriching.has(selectedProspect._id)}
                      className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${enriching.has(selectedProspect._id) ? 'animate-spin' : ''}`} />
                      {enriching.has(selectedProspect._id) ? 'Researching…' : 'Research & Draft'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedProspect._id)}
                      disabled={deleting === selectedProspect._id}
                      className="rounded-lg border border-gray-700 p-2 text-gray-500 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Contact Info (Edit Mode) */}
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))}
                      className="w-full rounded-md border border-gray-700 bg-gray-800/60 px-2 py-1.5 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Phone</label>
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full rounded-md border border-gray-700 bg-gray-800/60 px-2 py-1.5 text-sm text-white outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">LinkedIn URL</label>
                  <input
                    type="url"
                    value={editData.linkedinUrl}
                    onChange={(e) => setEditData((p) => ({ ...p, linkedinUrl: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800/60 px-2 py-1.5 text-sm text-white outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Company Website</label>
                  <input
                    type="url"
                    value={editData.websiteUrl}
                    onChange={(e) => setEditData((p) => ({ ...p, websiteUrl: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800/60 px-2 py-1.5 text-sm text-white outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    className="w-full rounded-md border border-gray-700 bg-gray-800/60 px-2 py-1.5 text-sm text-white outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Contact Info (View Mode) */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedProspect.linkedinUrl && (
                    <a
                      href={selectedProspect.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-gray-800/60 bg-gray-900/30 px-3 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-700 hover:text-white"
                    >
                      <Linkedin className="h-4 w-4 text-sky-400" />
                      <span className="truncate">LinkedIn</span>
                      <ExternalLink className="ml-auto h-3 w-3 text-gray-600" />
                    </a>
                  )}
                  {selectedProspect.websiteUrl && (
                    <a
                      href={selectedProspect.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-gray-800/60 bg-gray-900/30 px-3 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-700 hover:text-white"
                    >
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="truncate">Website</span>
                      <ExternalLink className="ml-auto h-3 w-3 text-gray-600" />
                    </a>
                  )}
                  {selectedProspect.email && (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-800/60 bg-gray-900/30 px-3 py-2.5 text-sm text-gray-300">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{selectedProspect.email}</span>
                    </div>
                  )}
                  {selectedProspect.phone && (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-800/60 bg-gray-900/30 px-3 py-2.5 text-sm text-gray-300">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{selectedProspect.phone}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {selectedProspect.notes && (
                  <div className="rounded-lg border border-gray-800/60 bg-gray-900/30 p-4">
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Notes</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{selectedProspect.notes}</p>
                  </div>
                )}
              </>
            )}

            {/* Research Snapshot */}
            {!editing && selectedResearch && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-medium text-white">Research</h3>
                  <span className="text-xs text-gray-500">
                    <Clock className="mr-0.5 inline h-3 w-3" />
                    {new Date(selectedResearch.researchedAt).toLocaleDateString()}
                  </span>
                </div>

                {selectedResearch.linkedinProfile?.headline && (
                  <div className="rounded-lg border border-gray-800/60 bg-gray-900/30 p-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">LinkedIn</p>
                    <p className="text-sm text-gray-300">{selectedResearch.linkedinProfile.headline}</p>
                    {selectedResearch.linkedinProfile.recentActivity && (
                      <div className="mt-2 border-t border-gray-800/40 pt-2">
                        <p className="text-xs text-gray-500">Recent activity:</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{selectedResearch.linkedinProfile.recentActivity.slice(0, 300)}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedResearch.companyInfo?.summary && (
                  <div className="rounded-lg border border-gray-800/60 bg-gray-900/30 p-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Company</p>
                    <p className="text-sm leading-relaxed text-gray-300">{selectedResearch.companyInfo.summary.slice(0, 500)}</p>
                  </div>
                )}

                {selectedResearch.newsArticles && selectedResearch.newsArticles.length > 0 && (
                  <div className="rounded-lg border border-gray-800/60 bg-gray-900/30 p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">News</p>
                    <ul className="space-y-2">
                      {selectedResearch.newsArticles.map((article, i) => (
                        <li key={i}>
                          <a href={article.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 text-sm text-gray-300 hover:text-white">
                            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-gray-600 group-hover:text-gray-400" />
                            <div>
                              <span className="font-medium">{article.title}</span>
                              <p className="mt-0.5 text-xs text-gray-500">{article.snippet}</p>
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedResearch.personalizationAngles && selectedResearch.personalizationAngles.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-400/80">Personalization Angles</p>
                    <ul className="space-y-1.5">
                      {selectedResearch.personalizationAngles.map((angle, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="mt-0.5 text-xs text-amber-400/60">{i + 1}.</span>
                          {angle}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Drafts */}
            {!editing && selectedDrafts && selectedDrafts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-medium text-white">Drafts</h3>
                </div>

                {selectedDrafts.map((draft) => (
                  <div key={draft._id} className="rounded-lg border border-gray-800/60 bg-gray-900/30 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-gray-800 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-400">
                          {draft.channel}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          draft.status === 'pending_review' ? 'bg-amber-500/10 text-amber-400' :
                          draft.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                          draft.status === 'sent' ? 'bg-purple-500/10 text-purple-400' :
                          draft.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                          'bg-gray-500/10 text-gray-400'
                        }`}>
                          {draft.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyDraft(draft.body, draft._id)}
                          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-700 hover:text-white"
                          title="Copy message"
                        >
                          {copiedDraftId === draft._id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <span className="text-xs text-gray-600">{new Date(draft.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {draft.subject && (
                      <p className="mb-1 text-xs font-medium text-gray-400">Subject: {draft.subject}</p>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{draft.body}</p>

                    {draft.sendError && (
                      <p className="mt-2 rounded border border-red-500/20 bg-red-500/5 px-2 py-1 text-xs text-red-400">
                        Send error: {draft.sendError}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2 border-t border-gray-800/40 pt-3">
                      {draft.status === 'pending_review' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDraftAction(draft._id, 'approve')}
                            disabled={draftAction === draft._id}
                            className="rounded-md bg-green-600/20 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-600/30 disabled:opacity-50"
                          >
                            {draftAction === draft._id ? 'Processing…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDraftAction(draft._id, 'reject')}
                            disabled={draftAction === draft._id}
                            className="rounded-md bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-600/30 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {draft.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleDraftAction(draft._id, 'send')}
                          disabled={draftAction === draft._id}
                          className="rounded-md bg-brand-600/20 px-3 py-1.5 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-600/30 disabled:opacity-50"
                        >
                          {draftAction === draft._id ? 'Sending…' : `Send via ${draft.channel}`}
                        </button>
                      )}
                      {draft.status === 'sent' && (
                        <>
                          {draft.sentAt && (
                            <span className="text-xs text-gray-500">Sent {new Date(draft.sentAt).toLocaleString()}</span>
                          )}
                          {!draft.crmSynced && (
                            <button
                              type="button"
                              onClick={() => handleCrmSync(draft._id)}
                              disabled={draftAction === draft._id}
                              className="rounded-md bg-gray-700/50 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
                            >
                              {draftAction === draft._id ? 'Syncing…' : 'Sync to CRM'}
                            </button>
                          )}
                          {draft.crmSynced && (
                            <span className="text-xs text-green-400/70">CRM synced</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800/60">
              <Users className="h-6 w-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">Select a prospect to see details</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeForm() }}
          role="dialog"
          aria-modal="true"
          aria-label="Add prospect"
        >
          <div className="mx-4 flex w-full max-w-lg flex-col rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800/60 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Add Prospect</h2>
              <button type="button" onClick={closeForm} aria-label="Close" className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {formError && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">{formError}</p>
              )}

              <div>
                <label htmlFor="prospect-name" className="mb-1.5 block text-sm font-medium text-gray-300">Name <span className="text-red-400">*</span></label>
                <input id="prospect-name" type="text" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="Jane Smith" className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50" />
              </div>

              <div>
                <label htmlFor="prospect-company" className="mb-1.5 block text-sm font-medium text-gray-300">Company</label>
                <input id="prospect-company" type="text" value={formData.company} onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))} placeholder="Acme Corp" className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prospect-email" className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
                  <input id="prospect-email" type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} placeholder="jane@acme.com" className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50" />
                </div>
                <div>
                  <label htmlFor="prospect-phone" className="mb-1.5 block text-sm font-medium text-gray-300">Phone</label>
                  <input id="prospect-phone" type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+1 555-0100" className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50" />
                </div>
              </div>

              <div>
                <label htmlFor="prospect-linkedin" className="mb-1.5 block text-sm font-medium text-gray-300">LinkedIn URL</label>
                <input id="prospect-linkedin" type="url" value={formData.linkedinUrl} onChange={(e) => setFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/janesmith" className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50" />
              </div>

              <div>
                <label htmlFor="prospect-website" className="mb-1.5 block text-sm font-medium text-gray-300">Company Website</label>
                <input id="prospect-website" type="url" value={formData.websiteUrl} onChange={(e) => setFormData((prev) => ({ ...prev, websiteUrl: e.target.value }))} placeholder="https://acme.com" className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50" />
              </div>

              <div>
                <label htmlFor="prospect-notes" className="mb-1.5 block text-sm font-medium text-gray-300">Notes</label>
                <textarea id="prospect-notes" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Any context for outreach — mutual connections, shared interests, reason for reaching out…" rows={3} className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2.5 text-sm leading-relaxed text-white placeholder-gray-600 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-800/60 px-6 py-4">
              <button type="button" onClick={closeForm} className="rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-800 hover:text-white">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50">{saving ? 'Saving…' : 'Add Prospect'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
