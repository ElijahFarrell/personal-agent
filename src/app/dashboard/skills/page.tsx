'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
} from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import {
  Zap,
  PackageOpen,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Upload,
  Building2,
  User,
  FolderUp,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import Link from 'next/link'
import { API_ROUTES } from '@/constants/api'
import {
  parseSkillFrontmatter,
  parseSkillFolderFromFileList,
  parseSkillZipFromArrayBuffer,
  validateSkillFrontmatter,
} from '@/lib/skillMarkdown'

type SeedStatus = 'idle' | 'seeding' | 'done' | 'error'
type ScopeTab = 'org' | 'user'

interface SkillsHealthPayload {
  health: {
    stats: {
      availableCount: number
      workspaceCount: number
      tenantContentCount: number
      preferenceCount: number
      enabledCount: number
      pinnedCount: number
      missingPreferenceCount: number
    }
    issues: string[]
    missingPreferences: string[]
  }
}

interface ResolvedSkillPreview {
  name: string
  score: number
  isPinned: boolean
}

interface SkillFormData {
  name: string
  description: string
  systemPrompt: string
  isEnabled: boolean
}

const EMPTY_FORM: SkillFormData = {
  name: '',
  description: '',
  systemPrompt: '',
  isEnabled: true,
}

export default function SkillsPage() {
  const { user } = useUser()
  const [seedStatus, setSeedStatus] = useState<SeedStatus>('idle')
  const [reindexing, setReindexing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<ScopeTab>('org')
  const hasSeeded = useRef(false)

  const [showForm, setShowForm] = useState(false)
  const [editingSkillId, setEditingSkillId] = useState<Id<'tenantSkills'> | null>(null)
  const [formData, setFormData] = useState<SkillFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Id<'tenantSkills'> | null>(null)
  const [skillsHealth, setSkillsHealth] = useState<SkillsHealthPayload['health'] | null>(null)
  const [healthError, setHealthError] = useState('')
  const [healthLoading, setHealthLoading] = useState(false)
  const [testQuery, setTestQuery] = useState('')
  const [testResolved, setTestResolved] = useState<ResolvedSkillPreview[]>([])
  const [testError, setTestError] = useState('')
  const [testingSkills, setTestingSkills] = useState(false)
  const [importedSkillLabel, setImportedSkillLabel] = useState<string | null>(null)
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [importedReferences, setImportedReferences] = useState<Record<string, string> | null>(null)

  const skillMdInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const orgSkills = useQuery(
    api.skills.getOrgSkills,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const userSkills = useQuery(
    api.skills.getUserSkills,
    dbUser ? { userId: dbUser._id } : 'skip'
  )

  const skills = activeTab === 'org' ? orgSkills : userSkills

  const createSkill = useMutation(api.skills.createSkill)
  const updateSkill = useMutation(api.skills.updateSkill)
  const deleteSkillMut = useMutation(api.skills.deleteSkill)
  const toggleSkillMut = useMutation(api.skills.toggleSkill)

  const enabledCount = skills?.filter((s) => s.isEnabled).length ?? 0

  const filteredSkills = skills?.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const name = s.skillName ?? s.name ?? ''
    const desc = s.description ?? ''
    return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
  })

  const fetchSkillsHealth = useCallback(async () => {
    if (!dbUser) return

    setHealthLoading(true)
    setHealthError('')

    try {
      const res = await fetch(API_ROUTES.skills)
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to load skills status' }))
        throw new Error(data.error)
      }

      const data = (await res.json()) as SkillsHealthPayload
      setSkillsHealth(data.health)
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Failed to load skills status')
    } finally {
      setHealthLoading(false)
    }
  }, [dbUser])

  const runSkillTest = useCallback(async () => {
    const query = testQuery.trim()
    if (!query) return

    setTestingSkills(true)
    setTestError('')

    try {
      const params = new URLSearchParams({ q: query })
      const res = await fetch(`${API_ROUTES.skills}?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Skill test failed' }))
        throw new Error(data.error)
      }

      const data = (await res.json()) as SkillsHealthPayload & {
        resolved: ResolvedSkillPreview[]
      }
      setSkillsHealth(data.health)
      setTestResolved(data.resolved)
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Skill test failed')
      setTestResolved([])
    } finally {
      setTestingSkills(false)
    }
  }, [testQuery])

  async function runSeed() {
    setSeedStatus('seeding')
    try {
      const res = await fetch(API_ROUTES.adminSeed, { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Seed failed' }))
        throw new Error(error)
      }
      setSeedStatus('done')
      await fetchSkillsHealth()
    } catch (err) {
      console.error('[Skills] Seed error:', err)
      setSeedStatus('error')
    }
  }

  async function runReindex() {
    setReindexing(true)
    try {
      const res = await fetch(API_ROUTES.skillsReindex, { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Reindex failed' }))
        throw new Error(error)
      }
      await fetchSkillsHealth()
    } catch (err) {
      console.error('[Skills] Reindex error:', err)
    } finally {
      setReindexing(false)
    }
  }

  useEffect(() => {
    if (hasSeeded.current) return
    if (dbUser && orgSkills && orgSkills.length === 0) {
      hasSeeded.current = true
      runSeed()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUser, orgSkills])

  useEffect(() => {
    if (!dbUser) return
    void fetchSkillsHealth()
  }, [dbUser, fetchSkillsHealth])

  function openCreateForm() {
    setEditingSkillId(null)
    setFormData(EMPTY_FORM)
    setFormError('')
    setImportedSkillLabel(null)
    setImportWarnings([])
    setImportedReferences(null)
    setShowForm(true)
  }

  function openEditForm(skill: NonNullable<typeof skills>[number]) {
    setEditingSkillId(skill._id)
    setFormData({
      name: skill.skillName ?? skill.name ?? '',
      description: skill.description ?? '',
      systemPrompt: skill.systemPrompt ?? '',
      isEnabled: skill.isEnabled,
    })
    setFormError('')
    setImportedSkillLabel(null)
    setImportWarnings([])
    setImportedReferences(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingSkillId(null)
    setFormData(EMPTY_FORM)
    setFormError('')
    setImportedSkillLabel(null)
    setImportWarnings([])
    setImportedReferences(null)
  }

  const handleImportSkillMd = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFormError('')
    try {
      const text = await file.text()
      const parsed = parseSkillFrontmatter(text)
      const err = validateSkillFrontmatter(parsed)
      if (err) {
        setFormError(err)
        return
      }
      setFormData((prev) => ({
        ...prev,
        name: parsed.name.trim(),
        description: parsed.description.trim(),
        systemPrompt: parsed.content,
      }))
      setImportedReferences(null)
      setImportWarnings([])
      setImportedSkillLabel(file.name)
    } catch {
      setFormError('Could not read SKILL.md')
    }
  }, [])

  const handleImportSkillFolder = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    e.target.value = ''
    if (!list?.length) return
    setFormError('')
    try {
      const result = await parseSkillFolderFromFileList(list)
      setFormData((prev) => ({
        ...prev,
        name: result.skillName,
        description: result.description,
        systemPrompt: result.content,
      }))
      setImportedReferences(
        Object.keys(result.references).length > 0 ? result.references : null
      )
      setImportWarnings(result.warnings)
      setImportedSkillLabel('Folder')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not read skill folder')
    }
  }, [])

  const handleImportSkillZip = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFormError('')
    try {
      const buf = await file.arrayBuffer()
      const result = await parseSkillZipFromArrayBuffer(buf)
      setFormData((prev) => ({
        ...prev,
        name: result.skillName,
        description: result.description,
        systemPrompt: result.content,
      }))
      setImportedReferences(
        Object.keys(result.references).length > 0 ? result.references : null
      )
      setImportWarnings(result.warnings)
      setImportedSkillLabel(file.name)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not read skill ZIP')
    }
  }, [])

  async function handleSave() {
    if (!formData.name.trim()) {
      setFormError('Name is required')
      return
    }
    if (!formData.systemPrompt.trim()) {
      setFormError('Content is required')
      return
    }
    if (!dbUser) return

    setSaving(true)
    setFormError('')

    try {
      const authorPayload: Record<string, unknown> = {
        skillName: formData.name.trim(),
        description: formData.description.trim(),
        content: formData.systemPrompt,
        scope: activeTab,
      }
      if (importedReferences && Object.keys(importedReferences).length > 0) {
        authorPayload.references = importedReferences
      }

      const res = await fetch(API_ROUTES.skillsAuthor, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authorPayload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error(data.error)
      }

      if (editingSkillId) {
        await updateSkill({
          skillId: editingSkillId,
          name: formData.name.trim(),
          description: formData.description.trim(),
          systemPrompt: formData.systemPrompt,
          isEnabled: formData.isEnabled,
        })
      }

      closeForm()
      await runReindex()
      await fetchSkillsHealth()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save skill')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(skillId: Id<'tenantSkills'>) {
    if (!confirm('Delete this skill? This cannot be undone.')) return
    setDeleting(skillId)
    try {
      await deleteSkillMut({ skillId })
      await runReindex()
      await fetchSkillsHealth()
    } catch (err) {
      console.error('[Skills] Delete error:', err)
    } finally {
      setDeleting(null)
    }
  }

  async function handleToggle(skillId: Id<'tenantSkills'>) {
    try {
      await toggleSkillMut({ skillId })
      await runReindex()
      await fetchSkillsHealth()
    } catch (err) {
      console.error('[Skills] Toggle error:', err)
    }
  }

  const isLoading = skills === undefined || seedStatus === 'seeding'

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white text-wrap-balance">
              Skills
            </h1>
            <p className="mt-1 text-[15px] text-gray-400">
              Manage your AI agent&rsquo;s capabilities. Skills are retrieved contextually during chat.
              {skills && skills.length > 0 && (
                <span className="ml-1.5 tabular-nums text-gray-500">
                  {enabledCount} of {skills.length} enabled
                </span>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={runReindex}
              disabled={reindexing || isLoading}
              aria-label="Re-index skills in vector store"
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
            >
              <Upload
                className={`h-3.5 w-3.5 ${reindexing ? 'animate-pulse' : ''}`}
                aria-hidden="true"
              />
              {reindexing ? 'Indexing…' : 'Re-index'}
            </button>

            {activeTab === 'org' && (
              <button
                type="button"
                onClick={runSeed}
                disabled={isLoading}
                aria-label="Sync skills from filesystem"
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${seedStatus === 'seeding' ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {seedStatus === 'seeding' ? 'Syncing…' : 'Sync from Files'}
              </button>
            )}

            <Link
              href="/dashboard/skills/browse"
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Browse Skills
            </Link>

            <button
              type="button"
              onClick={openCreateForm}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New Skill
            </button>
          </div>
        </div>

        {seedStatus === 'error' && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
            Sync failed. Check the terminal for details, then try again.
          </p>
        )}

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-white/10 bg-card/80 backdrop-blur-md p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-white">Skills Status</h2>
                <p className="mt-1 text-xs text-gray-500">
                  This shows whether the chat runtime can actually retrieve skills, not just whether
                  preference rows exist in Convex.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchSkillsHealth}
                disabled={healthLoading || !dbUser}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                Refresh Status
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-card/60 backdrop-blur-sm p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Retrievable</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {skillsHealth?.stats.availableCount ?? '—'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-card/60 backdrop-blur-sm p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Local Files</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {skillsHealth?.stats.workspaceCount ?? '—'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-card/60 backdrop-blur-sm p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Tenant Content</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {skillsHealth?.stats.tenantContentCount ?? '—'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-card/60 backdrop-blur-sm p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Missing Mappings</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {skillsHealth?.stats.missingPreferenceCount ?? '—'}
                </p>
              </div>
            </div>

            {healthError && (
              <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {healthError}
              </p>
            )}

            {skillsHealth?.issues.length ? (
              <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <p className="text-xs font-medium text-amber-300">Attention needed</p>
                <div className="mt-2 flex flex-col gap-1.5 text-xs text-amber-200/90">
                  {skillsHealth.issues.map((issue) => (
                    <p key={issue}>{issue}</p>
                  ))}
                </div>
              </div>
            ) : skillsHealth ? (
              <p className="mt-4 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-xs text-green-300">
                Skill retrieval looks healthy. Preferences and retrievable skills are aligned.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-card/80 backdrop-blur-md p-5">
            <h2 className="text-sm font-medium text-white">Test Retrieval</h2>
            <p className="mt-1 text-xs text-gray-500">
              Enter a sample prompt to preview which skills chat would inject.
            </p>

            <div className="mt-4 flex gap-3">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void runSkillTest()
                  }
                }}
                placeholder="e.g. draft a linkedin post for founders"
                className="flex-1 rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
              />
              <button
                type="button"
                onClick={() => void runSkillTest()}
                disabled={testingSkills || !testQuery.trim()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {testingSkills ? 'Testing…' : 'Test'}
              </button>
            </div>

            {testError && (
              <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {testError}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {testResolved.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-card/60 backdrop-blur-sm px-3 py-3 text-xs text-muted-foreground">
                  Run a test prompt to see the matching skills here.
                </p>
              ) : (
                testResolved.map((skill) => (
                  <div
                    key={skill.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-card/60 backdrop-blur-sm px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{skill.name}</p>
                      <p className="text-[11px] text-gray-500">
                        score {skill.score.toFixed(2)}
                      </p>
                    </div>
                    {skill.isPinned ? (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-300">
                        Pinned
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Scope Tabs */}
        <div className="flex gap-1 rounded-lg border border-white/10 bg-card/80 backdrop-blur-md p-1">
          <button
            type="button"
            onClick={() => setActiveTab('org')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'org'
                ? 'bg-accent text-accent-foreground'
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
                ? 'bg-accent text-accent-foreground'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            My Skills
          </button>
        </div>

        {/* Search */}
        {skills && skills.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search skills…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background/80 py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
            />
          </div>
        )}

        {/* Skills List */}
        <section
          aria-label="Skills list"
          className="rounded-xl border border-white/10 bg-card/80 backdrop-blur-md"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-600" aria-hidden="true" />
              <p className="text-sm text-gray-500">
                {seedStatus === 'seeding' ? 'Indexing skills…' : 'Loading…'}
              </p>
            </div>
          ) : filteredSkills && filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                <PackageOpen className="h-5 w-5 text-gray-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">
                  {searchQuery ? 'No matching skills' : activeTab === 'user' ? 'No personal skills yet' : 'No skills found'}
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {searchQuery
                    ? 'Try a different search term.'
                    : activeTab === 'user'
                      ? 'Create a personal skill to customize your agent\'s behavior for your role.'
                      : 'Click "New Skill" to create one, or "Sync from Files" to import from the skills/ directory.'}
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-800/60" role="list">
              {filteredSkills?.map((skill) => (
                <li
                  key={skill._id}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        skill.isEnabled ? 'bg-amber-500/10' : 'bg-muted/60'
                      }`}
                      aria-hidden="true"
                    >
                      <Zap
                        className={`h-3.5 w-3.5 ${
                          skill.isEnabled ? 'text-amber-400' : 'text-gray-600'
                        }`}
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{skill.skillName ?? skill.name}</p>
                      <p className="truncate text-xs text-gray-500">{skill.description ?? ''}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={skill.isEnabled}
                      aria-label={`${skill.isEnabled ? 'Disable' : 'Enable'} ${skill.skillName ?? skill.name}`}
                      onClick={() => handleToggle(skill._id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        skill.isEnabled ? 'bg-brand-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                          skill.isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditForm(skill)}
                      aria-label={`Edit ${skill.skillName ?? skill.name}`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(skill._id)}
                      disabled={deleting === skill._id}
                      aria-label={`Delete ${skill.skillName ?? skill.name}`}
                      className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                    >
                      <Trash2 className={`h-3.5 w-3.5 ${deleting === skill._id ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeForm() }}
          role="dialog"
          aria-modal="true"
          aria-label={editingSkillId ? 'Edit skill' : 'Create new skill'}
        >
          <div className="mx-4 flex w-full max-w-2xl flex-col rounded-xl border border-white/10 bg-card/90 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editingSkillId ? 'Edit Skill' : 'Create New Skill'}
                </h2>
                {!editingSkillId && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    This skill will be added to{' '}
                    {activeTab === 'org' ? 'the organization (shared)' : 'your personal skills'}
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
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">
                  {formError}
                </p>
              )}

              <div>
                <label htmlFor="skill-name" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Name
                </label>
                <input
                  id="skill-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Brand Voice"
                  className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                />
              </div>

              <div>
                <label htmlFor="skill-description" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Description
                </label>
                <input
                  id="skill-description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="A short summary of what this skill does"
                  className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                />
              </div>

              {importWarnings.length > 0 ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
                  <p className="font-medium text-amber-300">Import notes</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {importWarnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <div className="mb-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label htmlFor="skill-content" className="block text-sm font-medium text-gray-300">
                    Content <span className="text-gray-500">(Markdown supported)</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={skillMdInputRef}
                      type="file"
                      accept=".md,.markdown,text/markdown"
                      className="sr-only"
                      aria-label="Import SKILL.md file"
                      onChange={handleImportSkillMd}
                    />
                    <input
                      ref={folderInputRef}
                      type="file"
                      multiple
                      className="sr-only"
                      aria-label="Import skill folder with references"
                      onChange={handleImportSkillFolder}
                      {...({ webkitdirectory: '' } as ComponentPropsWithoutRef<'input'>)}
                    />
                    <input
                      ref={zipInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      className="sr-only"
                      aria-label="Import skill ZIP"
                      onChange={handleImportSkillZip}
                    />
                    <button
                      type="button"
                      onClick={() => skillMdInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      SKILL.md
                    </button>
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <FolderUp className="h-3.5 w-3.5" aria-hidden="true" />
                      Folder
                    </button>
                    <button
                      type="button"
                      onClick={() => zipInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <PackageOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      ZIP
                    </button>
                    {importedSkillLabel ? (
                      <span className="text-xs text-gray-500">Loaded: {importedSkillLabel}</span>
                    ) : null}
                  </div>
                </div>
                <textarea
                  id="skill-content"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  placeholder={`# Skill: My Skill\n\n## Description\nDescribe what this skill does...\n\n## When to Use This Skill\n- Trigger 1\n- Trigger 2\n\n## Instructions\nStep-by-step instructions for the AI agent...`}
                  rows={16}
                  className="w-full rounded-lg border border-input bg-background/80 px-3 py-2.5 font-mono text-sm leading-relaxed text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                />
                <p className="mt-1.5 text-xs text-gray-600">
                  Import a Cursor-style SKILL.md (YAML frontmatter with name and description), or a folder/ZIP with{' '}
                  <code className="rounded bg-muted/60 px-1">references/</code> for bundled files. You can still edit before saving.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isEnabled}
                  onClick={() => setFormData((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    formData.isEnabled ? 'bg-brand-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                      formData.isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-300">
                  {formData.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
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
                {saving ? 'Saving…' : editingSkillId ? 'Update Skill' : 'Create Skill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
