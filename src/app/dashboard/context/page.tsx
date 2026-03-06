'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import {
  FileText,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Briefcase,
  Settings2,
  BookOpen,
  Tag,
  Building2,
  User,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { API_ROUTES } from '@/constants/api'

type DocCategory = 'business-info' | 'preferences' | 'reference-docs' | 'custom'
type ScopeTab = 'org' | 'user'

interface DocFormData {
  title: string
  content: string
  category: DocCategory
}

const EMPTY_FORM: DocFormData = {
  title: '',
  content: '',
  category: 'business-info',
}

const CATEGORY_META: Record<DocCategory, { label: string; icon: typeof Briefcase; color: string }> = {
  'business-info': { label: 'Business Info', icon: Briefcase, color: 'text-blue-400 bg-blue-500/10' },
  preferences: { label: 'Preferences', icon: Settings2, color: 'text-purple-400 bg-purple-500/10' },
  'reference-docs': { label: 'Reference Docs', icon: BookOpen, color: 'text-amber-400 bg-amber-500/10' },
  custom: { label: 'Custom', icon: Tag, color: 'text-green-400 bg-green-500/10' },
}

export default function ContextPage() {
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<ScopeTab>('org')
  const [showForm, setShowForm] = useState(false)
  const [editingDocId, setEditingDocId] = useState<Id<'contextDocs'> | null>(null)
  const [formData, setFormData] = useState<DocFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Id<'contextDocs'> | null>(null)
  const [indexing, setIndexing] = useState(false)

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const orgDocs = useQuery(
    api.contextDocs.getOrgContextDocs,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const userDocs = useQuery(
    api.contextDocs.getUserContextDocs,
    dbUser ? { userId: dbUser._id } : 'skip'
  )

  const docs = activeTab === 'org' ? orgDocs : userDocs

  const createDoc = useMutation(api.contextDocs.createContextDoc)
  const updateDoc = useMutation(api.contextDocs.updateContextDoc)
  const deleteDocMut = useMutation(api.contextDocs.deleteContextDoc)

  const filteredDocs = docs?.filter((d) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
  })

  const groupedDocs = filteredDocs
    ? Object.entries(CATEGORY_META).reduce(
        (acc, [cat]) => {
          const items = filteredDocs.filter((d) => d.category === cat)
          if (items.length > 0) acc[cat as DocCategory] = items
          return acc
        },
        {} as Record<DocCategory, typeof filteredDocs>
      )
    : {}

  function openCreateForm() {
    setEditingDocId(null)
    setFormData(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEditForm(doc: NonNullable<typeof docs>[number]) {
    setEditingDocId(doc._id)
    setFormData({
      title: doc.title,
      content: doc.content,
      category: doc.category as DocCategory,
    })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingDocId(null)
    setFormData(EMPTY_FORM)
    setFormError('')
  }

  async function indexDocInQdrant(docId: string, data: DocFormData) {
    setIndexing(true)
    try {
      await fetch(API_ROUTES.contextIndex, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId,
          title: data.title,
          content: data.content,
          category: data.category,
          scope: activeTab,
        }),
      })
    } catch (err) {
      console.warn('[Context] Indexing failed (doc saved but not vectorized):', err)
    } finally {
      setIndexing(false)
    }
  }

  async function handleSave() {
    if (!formData.title.trim()) {
      setFormError('Title is required')
      return
    }
    if (!formData.content.trim()) {
      setFormError('Content is required')
      return
    }
    if (!dbUser) return

    setSaving(true)
    setFormError('')

    try {
      if (editingDocId) {
        await updateDoc({
          docId: editingDocId,
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
        })
        await indexDocInQdrant(editingDocId, formData)
      } else {
        const newId = await createDoc({
          tenantId: dbUser.tenantId,
          userId: dbUser._id,
          scope: activeTab,
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
        })
        await indexDocInQdrant(newId, formData)
      }
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = useCallback(
    async (docId: Id<'contextDocs'>) => {
      if (!confirm('Delete this context doc? This cannot be undone.')) return
      setDeleting(docId)
      try {
        await deleteDocMut({ docId })
        await fetch(API_ROUTES.contextIndex, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docId }),
        }).catch(() => {})
      } catch (err) {
        console.error('[Context] Delete error:', err)
      } finally {
        setDeleting(null)
      }
    },
    [deleteDocMut]
  )

  const isLoading = docs === undefined

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Context</h1>
            <p className="mt-1 text-[15px] text-gray-400">
              Add business information, preferences, and reference docs. Your AI agent uses this to personalize every response.
              {docs && docs.length > 0 && (
                <span className="ml-1.5 tabular-nums text-gray-500">
                  {docs.length} doc{docs.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Context
          </button>
        </div>

        {/* Scope Tabs */}
        <div className="flex gap-1 rounded-lg border border-gray-800 bg-gray-900/50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('org')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'org'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Organization
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('user')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'user'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Personal
          </button>
        </div>

        {/* Search */}
        {docs && docs.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search context docs…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-900/50 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-gray-600 focus:ring-1 focus:ring-brand-500/50"
            />
          </div>
        )}

        {/* Docs List grouped by category */}
        {isLoading ? (
          <section className="rounded-xl border border-gray-800/80 bg-gray-900/50">
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-brand-500" />
              <p className="text-sm text-gray-500">Loading…</p>
            </div>
          </section>
        ) : filteredDocs && filteredDocs.length === 0 ? (
          <section className="rounded-xl border border-gray-800/80 bg-gray-900/50">
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/60">
                <FolderOpen className="h-5 w-5 text-gray-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">
                  {searchQuery
                    ? 'No matching docs'
                    : activeTab === 'user'
                      ? 'No personal context yet'
                      : 'No context added yet'}
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {searchQuery
                    ? 'Try a different search term.'
                    : activeTab === 'user'
                      ? 'Add context about your role, preferences, or personal reference docs.'
                      : 'Add your business info, brand voice, ICP details, or any reference docs your AI agent should always know about.'}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <div className="space-y-4">
            {(Object.entries(groupedDocs) as [DocCategory, NonNullable<typeof docs>][]).map(
              ([category, items]) => {
                const meta = CATEGORY_META[category]
                const Icon = meta.icon
                return (
                  <section
                    key={category}
                    aria-label={meta.label}
                    className="rounded-xl border border-gray-800/80 bg-gray-900/50"
                  >
                    <div className="flex items-center gap-2 border-b border-gray-800/60 px-5 py-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-md ${meta.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <h2 className="text-sm font-medium text-gray-300">{meta.label}</h2>
                      <span className="text-xs tabular-nums text-gray-600">{items.length}</span>
                    </div>

                    <ul className="divide-y divide-gray-800/60" role="list">
                      {items.map((doc) => (
                        <li
                          key={doc._id}
                          className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-800/20"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <FileText className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">{doc.title}</p>
                              <p className="truncate text-xs text-gray-500">
                                {doc.content.slice(0, 120)}{doc.content.length > 120 ? '…' : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(doc)}
                              aria-label={`Edit ${doc.title}`}
                              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(doc._id)}
                              disabled={deleting === doc._id}
                              aria-label={`Delete ${doc.title}`}
                              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                            >
                              <Trash2 className={`h-3.5 w-3.5 ${deleting === doc._id ? 'animate-pulse' : ''}`} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              }
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeForm() }}
          role="dialog"
          aria-modal="true"
          aria-label={editingDocId ? 'Edit context doc' : 'Add context'}
        >
          <div className="mx-4 flex w-full max-w-2xl flex-col rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800/60 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingDocId ? 'Edit Context' : 'Add Context'}
                </h2>
                {!editingDocId && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    This doc will be added to{' '}
                    {activeTab === 'org' ? 'the organization (shared)' : 'your personal context'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close"
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {formError && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">
                  {formError}
                </p>
              )}

              <div>
                <label htmlFor="ctx-title" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Title
                </label>
                <input
                  id="ctx-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Our ICP, Brand Voice, Pricing"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                />
              </div>

              <div>
                <label htmlFor="ctx-category" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Category
                </label>
                <select
                  id="ctx-category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as DocCategory }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                >
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ctx-content" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Content
                </label>
                <textarea
                  id="ctx-content"
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder={
                    activeTab === 'user'
                      ? `Add context about your role and how you work.\n\nExamples:\n- Your role and responsibilities\n- Communication preferences\n- Tools and workflows you use\n- Key projects you're working on`
                      : `Add any information your AI agent should know about your business.\n\nExamples:\n- Business description and niche\n- Target audience / ICP details\n- Brand voice and tone guidelines\n- Key products or services\n- Pricing information\n- Common FAQs`
                  }
                  rows={14}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2.5 text-sm leading-relaxed text-white placeholder-gray-600 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                />
                <p className="mt-1.5 text-xs text-gray-600">
                  This content is vectorized and automatically injected into chat when relevant.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-800/60 px-6 py-4">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || indexing}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : indexing ? 'Indexing…' : editingDocId ? 'Update' : 'Add Context'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
