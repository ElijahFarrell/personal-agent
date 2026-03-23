'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Copy,
  Linkedin,
  Building2,
  User,
  Video,
  Camera,
  Music2,
  MessageCircle,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

type ScopeTab = 'org' | 'user'
type PlatformTab = 'linkedin' | 'x' | 'youtube' | 'instagram' | 'tiktok'

interface DraftFormData {
  platform: PlatformTab
  content: string
  title?: string
}

const EMPTY_FORM: DraftFormData = {
  platform: 'linkedin',
  content: '',
  title: '',
}

const PLATFORM_META: Record<
  PlatformTab,
  { label: string; icon: typeof Linkedin; color: string; available: boolean }
> = {
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400 bg-sky-500/10', available: true },
  x: { label: 'X (Twitter)', icon: MessageCircle, color: 'text-gray-400 bg-gray-500/10', available: true },
  youtube: { label: 'YouTube', icon: Video, color: 'text-red-400 bg-red-500/10', available: false },
  instagram: { label: 'Instagram', icon: Camera, color: 'text-pink-400 bg-pink-500/10', available: false },
  tiktok: { label: 'TikTok', icon: Music2, color: 'text-cyan-400 bg-cyan-500/10', available: true },
}

const AVAILABLE_PLATFORMS: PlatformTab[] = ['linkedin', 'x']

export default function ContentDraftsPage() {
  const { user } = useUser()
  const [activeScope, setActiveScope] = useState<ScopeTab>('org')
  const [activePlatform, setActivePlatform] = useState<PlatformTab>('linkedin')
  const [showForm, setShowForm] = useState(false)
  const [editingDraftId, setEditingDraftId] = useState<Id<'contentDrafts'> | null>(null)
  const [formData, setFormData] = useState<DraftFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Id<'contentDrafts'> | null>(null)
  const [copiedId, setCopiedId] = useState<Id<'contentDrafts'> | null>(null)

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const orgDrafts = useQuery(
    api.contentDrafts.getOrgContentDrafts,
    dbUser ? { tenantId: dbUser.tenantId, platform: activePlatform } : 'skip'
  )

  const userDrafts = useQuery(
    api.contentDrafts.getUserContentDrafts,
    dbUser ? { userId: dbUser._id, platform: activePlatform } : 'skip'
  )

  const drafts = activeScope === 'org' ? orgDrafts : userDrafts

  const createDraft = useMutation(api.contentDrafts.createContentDraft)
  const updateDraft = useMutation(api.contentDrafts.updateContentDraft)
  const deleteDraft = useMutation(api.contentDrafts.deleteContentDraft)

  function openCreateForm() {
    setEditingDraftId(null)
    setFormData({ ...EMPTY_FORM, platform: activePlatform })
    setFormError('')
    setShowForm(true)
  }

  function openEditForm(draft: NonNullable<typeof drafts>[number]) {
    setEditingDraftId(draft._id)
    setFormData({
      platform: draft.platform as PlatformTab,
      content: draft.content,
      title: draft.title ?? '',
    })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingDraftId(null)
    setFormData(EMPTY_FORM)
    setFormError('')
  }

  async function handleSave() {
    if (!formData.content.trim()) {
      setFormError('Content is required')
      return
    }
    if (!dbUser) return

    setSaving(true)
    setFormError('')

    try {
      if (editingDraftId) {
        await updateDraft({
          draftId: editingDraftId,
          content: formData.content.trim(),
          title: formData.title?.trim() || undefined,
          platform: formData.platform,
        })
      } else {
        await createDraft({
          tenantId: dbUser.tenantId,
          userId: dbUser._id,
          scope: activeScope,
          platform: formData.platform,
          content: formData.content.trim(),
          title: formData.title?.trim() || undefined,
        })
      }
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = useCallback(async (draft: NonNullable<typeof drafts>[number]) => {
    try {
      await navigator.clipboard.writeText(draft.content)
      setCopiedId(draft._id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('[Content] Copy failed:', err)
    }
  }, [])

  const handleDelete = useCallback(
    async (draftId: Id<'contentDrafts'>) => {
      if (!confirm('Delete this draft? This cannot be undone.')) return
      setDeleting(draftId)
      try {
        await deleteDraft({ draftId })
      } catch (err) {
        console.error('[Content] Delete error:', err)
      } finally {
        setDeleting(null)
      }
    },
    [deleteDraft]
  )

  const isLoading = drafts === undefined
  const isPlatformAvailable = PLATFORM_META[activePlatform].available

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Drafts</h1>
            <p className="mt-1 text-[15px] text-gray-400">
              Draft and manage posts for LinkedIn, X, and more. Copy to clipboard to post manually.
              {drafts && drafts.length > 0 && (
                <span className="ml-1.5 tabular-nums text-gray-500">
                  {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          {isPlatformAvailable && (
            <button
              type="button"
              onClick={openCreateForm}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Draft
            </button>
          )}
        </div>

        {/* Scope Tabs */}
        <div className="flex gap-1 rounded-lg border border-white/10 bg-card/80 backdrop-blur-md p-1">
          <button
            type="button"
            onClick={() => setActiveScope('org')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeScope === 'org'
                ? 'bg-accent text-accent-foreground'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Organization
          </button>
          <button
            type="button"
            onClick={() => setActiveScope('user')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeScope === 'user'
                ? 'bg-accent text-accent-foreground'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Personal
          </button>
        </div>

        {/* Platform Tabs */}
        <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-card/80 backdrop-blur-md p-1">
          {(Object.entries(PLATFORM_META) as [PlatformTab, (typeof PLATFORM_META)[PlatformTab]][]).map(
            ([platform, meta]) => {
              const Icon = meta.icon
              const isActive = activePlatform === platform
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setActivePlatform(platform)}
                  disabled={!meta.available}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? `${meta.color}`
                      : meta.available
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'cursor-not-allowed text-gray-600 opacity-60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                  {!meta.available && (
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">
                      Soon
                    </span>
                  )}
                </button>
              )
            }
          )}
        </div>

        {/* Drafts List */}
        {isLoading ? (
          <section className="rounded-xl border border-white/10 bg-card/80 backdrop-blur-md">
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-brand-500" />
              <p className="text-sm text-gray-500">Loading…</p>
            </div>
          </section>
        ) : drafts && drafts.length === 0 ? (
          <section className="rounded-xl border border-white/10 bg-card/80 backdrop-blur-md">
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                <Linkedin className="h-5 w-5 text-gray-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">
                  {isPlatformAvailable
                    ? `No ${PLATFORM_META[activePlatform].label} drafts yet`
                    : 'Coming soon'}
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {isPlatformAvailable
                    ? `Create a draft or ask the Content agent in Chat to write one for you.`
                    : `${PLATFORM_META[activePlatform].label} support is coming soon.`}
                </p>
              </div>
              {isPlatformAvailable && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-2 flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Draft
                </button>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-white/10 bg-card/80 backdrop-blur-md">
            <ul className="divide-y divide-gray-800/60" role="list">
              {drafts?.map((draft) => (
                <li
                  key={draft._id}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    {draft.title && (
                      <p className="text-sm font-medium text-white">{draft.title}</p>
                    )}
                    <p className="truncate text-sm text-gray-400">
                      {draft.content.slice(0, 150)}
                      {draft.content.length > 150 ? '…' : ''}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {new Date(draft.createdAt).toLocaleDateString()} · {draft.status}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(draft)}
                      aria-label="Copy to clipboard"
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      title="Copy to clipboard"
                    >
                      <Copy
                        className={`h-3.5 w-3.5 ${copiedId === draft._id ? 'text-green-400' : ''}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(draft)}
                      aria-label="Edit draft"
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(draft._id)}
                      disabled={deleting === draft._id}
                      aria-label="Delete draft"
                      className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                    >
                      <Trash2
                        className={`h-3.5 w-3.5 ${deleting === draft._id ? 'animate-pulse' : ''}`}
                      />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm()
          }}
          role="dialog"
          aria-modal="true"
          aria-label={editingDraftId ? 'Edit draft' : 'Add draft'}
        >
          <div className="mx-4 flex w-full max-w-2xl flex-col rounded-xl border border-white/10 bg-card/90 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingDraftId ? 'Edit Draft' : 'Add Draft'}
                </h2>
                {!editingDraftId && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    This draft will be added to{' '}
                    {activeScope === 'org' ? 'the organization (shared)' : 'your personal content'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {formError && (
                <p
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
                  role="alert"
                >
                  {formError}
                </p>
              )}

              <div>
                <label
                  htmlFor="draft-platform"
                  className="mb-1.5 block text-sm font-medium text-gray-300"
                >
                  Platform
                </label>
                <select
                  id="draft-platform"
                  value={formData.platform}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, platform: e.target.value as PlatformTab }))
                  }
                  className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                >
                  {AVAILABLE_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_META[p].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="draft-title"
                  className="mb-1.5 block text-sm font-medium text-gray-300"
                >
                  Title (optional)
                </label>
                <input
                  id="draft-title"
                  type="text"
                  value={formData.title ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Q1 Launch Announcement"
                  className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                />
              </div>

              <div>
                <label
                  htmlFor="draft-content"
                  className="mb-1.5 block text-sm font-medium text-gray-300"
                >
                  Content
                </label>
                <textarea
                  id="draft-content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Write your post content here…"
                  rows={12}
                  className="w-full rounded-lg border border-input bg-background/80 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-input bg-background/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingDraftId ? 'Update' : 'Add Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
