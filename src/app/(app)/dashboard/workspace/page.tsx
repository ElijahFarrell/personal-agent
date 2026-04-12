'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import {
  FileText,
  FolderOpen,
  Trash2,
  Loader2,
  RefreshCw,
  Upload,
  Globe,
  Youtube,
  StickyNote,
  FileUp,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { API_ROUTES } from '@/constants/api'
import { WORKSPACE_DOC_STATUS, WORKSPACE_DOC_TYPE } from '@convex/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { ProcessingStatus } from '@/components/workspace/ProcessingStatus'

type ScopeTab = 'org' | 'user'
type InputMode = 'note' | 'url' | 'file'

function detectInputMode(value: string): InputMode {
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return 'url'
  return 'note'
}

function detectUrlType(url: string): 'youtube' | 'webpage' {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  return 'webpage'
}

const MODE_META: Record<InputMode, { label: string; icon: typeof Globe }> = {
  url: { label: 'Link', icon: Globe },
  note: { label: 'Note', icon: StickyNote },
  file: { label: 'PDF', icon: FileUp },
}

function fireProcessRequest(docId: Id<'workspaceDocuments'>) {
  void fetch(API_ROUTES.workspaceProcess, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docId }),
  }).catch((err) => console.error('[workspace] process fire-and-forget error', err))
}

export default function WorkspacePage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState<ScopeTab>('org')
  const [inputValue, setInputValue] = useState('')
  const [modeOverride, setModeOverride] = useState<InputMode | null>(null)
  const [showTitle, setShowTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const orgDocs = useQuery(
    api.workspaceDocuments.getOrgWorkspaceDocuments,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const userDocs = useQuery(
    api.workspaceDocuments.getUserWorkspaceDocuments,
    dbUser ? { userId: dbUser._id } : 'skip'
  )

  const folders = useQuery(
    api.workspaceFolders.listWorkspaceFolders,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  const createDoc = useMutation(api.workspaceDocuments.createWorkspaceDocument)
  const genUploadUrl = useMutation(api.workspaceDocuments.generateWorkspaceUploadUrl)

  const docs = activeTab === 'org' ? orgDocs : userDocs

  const allDocs = useMemo(() => {
    const combined: typeof orgDocs = []
    if (orgDocs) combined.push(...orgDocs)
    if (userDocs) combined.push(...userDocs)
    return combined
  }, [orgDocs, userDocs])

  const detectedMode = detectInputMode(inputValue)
  const activeMode = modeOverride ?? detectedMode

  const isYoutubeUrl =
    activeMode === 'url' && detectUrlType(inputValue.trim()) === 'youtube'

  const resetForm = useCallback(() => {
    setInputValue('')
    setTitle('')
    setShowTitle(false)
    setModeOverride(null)
  }, [])

  const handleSubmit = async () => {
    if (!dbUser || saving) return

    const value = inputValue.trim()
    if (!value && activeMode !== 'file') return

    setSaving(true)
    try {
      if (activeMode === 'url') {
        const urlType =
          detectUrlType(value) === 'youtube'
            ? WORKSPACE_DOC_TYPE.YOUTUBE
            : WORKSPACE_DOC_TYPE.WEBPAGE
        const docTitle = title.trim() || value
        const docId = await createDoc({
          tenantId: dbUser.tenantId,
          userId: dbUser._id,
          scope: activeTab,
          title: docTitle,
          type: urlType,
          sourceUrl: value,
          status: WORKSPACE_DOC_STATUS.PENDING,
        })
        fireProcessRequest(docId)
        toast.success(`Processing "${docTitle}"`, {
          description: `${urlType === 'youtube' ? 'YouTube transcript' : 'Web page'} extraction started`,
        })
      } else if (activeMode === 'note') {
        const docTitle = title.trim() || value.slice(0, 60)
        const docId = await createDoc({
          tenantId: dbUser.tenantId,
          userId: dbUser._id,
          scope: activeTab,
          title: docTitle,
          type: WORKSPACE_DOC_TYPE.NOTE,
          extractedText: value,
          status: WORKSPACE_DOC_STATUS.READY,
        })
        void fetch(API_ROUTES.workspaceIndexDoc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docId }),
        }).catch((err) => console.error('[workspace] index error', err))
        toast.success(`Note "${docTitle}" saved`)
      }
      resetForm()
    } catch (e) {
      console.error(e)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const processFile = async (file: File) => {
    if (!dbUser) return
    setSaving(true)
    setUploadingFile(file.name)
    try {
      const postUrl = await genUploadUrl({
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
      })
      const put = await fetch(postUrl, { method: 'POST', body: file })
      const json = (await put.json()) as { storageId: string }
      const docTitle = title.trim() || file.name
      const docId = await createDoc({
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
        scope: activeTab,
        title: docTitle,
        type: WORKSPACE_DOC_TYPE.PDF,
        storageId: json.storageId as Id<'_storage'>,
        mimeType: file.type || 'application/pdf',
        fileSize: file.size,
        status: WORKSPACE_DOC_STATUS.PENDING,
      })
      fireProcessRequest(docId)
      toast.success(`Uploaded "${docTitle}"`, {
        description: 'PDF processing started',
      })
      resetForm()
    } catch (err) {
      console.error(err)
      toast.error('Upload failed')
    } finally {
      setSaving(false)
      setUploadingFile(null)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf' || file?.name.endsWith('.pdf')) {
      void processFile(file)
    } else if (file) {
      toast.error('Only PDF files are supported')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && activeMode === 'url') {
      e.preventDefault()
      void handleSubmit()
    }
  }

  const handleDelete = async (docId: Id<'workspaceDocuments'>) => {
    if (!confirm('Delete this document from the workspace?')) return
    await fetch(API_ROUTES.workspaceDeleteDoc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId }),
    })
  }

  const handleMigrate = async () => {
    if (!confirm('Copy legacy Context docs into Workspace and index them?')) return
    setMigrating(true)
    try {
      const res = await fetch(API_ROUTES.workspaceMigrateFromContext, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`Imported ${data.imported ?? 0}, indexed ${data.indexed ?? 0}`)
      } else {
        toast.error(data.error ?? 'Migration failed')
      }
    } finally {
      setMigrating(false)
    }
  }

  const ModeIcon = MODE_META[activeMode].icon

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Paste a URL, drop a PDF, or write a note — everything is indexed for AI.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleMigrate} disabled={migrating}>
            {migrating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Migrate from Context
          </Button>
        </header>

        {/* Inline input area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'border-border bg-background rounded-xl border p-4 transition-colors',
            isDragOver && 'border-primary/50 bg-primary/5',
            uploadingFile && 'pointer-events-none opacity-70'
          )}
        >
          {uploadingFile ? (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              <span className="text-sm font-medium">Uploading {uploadingFile}...</span>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <div className="flex shrink-0 pt-2">
                  <Select
                    value={activeMode}
                    onValueChange={(v) => setModeOverride(v as InputMode)}
                  >
                    <SelectTrigger className="h-8 w-auto gap-1.5 border-none bg-transparent px-2 shadow-none">
                      <ModeIcon className="h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">
                        <span className="flex items-center gap-2">
                          <StickyNote className="h-3.5 w-3.5" /> Note
                        </span>
                      </SelectItem>
                      <SelectItem value="url">
                        <span className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5" /> Link
                        </span>
                      </SelectItem>
                      <SelectItem value="file">
                        <span className="flex items-center gap-2">
                          <FileUp className="h-3.5 w-3.5" /> PDF
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0 flex-1">
                  {activeMode === 'file' ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleFileInput}
                      />
                      <Upload className="text-muted-foreground h-8 w-8" />
                      <p className="text-muted-foreground text-sm">
                        Drop a PDF here or{' '}
                        <button
                          type="button"
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={() => fileRef.current?.click()}
                        >
                          browse files
                        </button>
                      </p>
                    </div>
                  ) : (
                    <Textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value)
                        if (modeOverride && detectInputMode(e.target.value) !== modeOverride) {
                          setModeOverride(null)
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      rows={activeMode === 'note' && inputValue.length > 100 ? 4 : 1}
                      placeholder={
                        activeMode === 'url'
                          ? 'Paste a YouTube or web link...'
                          : 'Paste a URL, or type a note...'
                      }
                      className="resize-none border-none bg-transparent shadow-none focus-visible:ring-0"
                    />
                  )}
                </div>

                {activeMode !== 'file' && (
                  <Button
                    size="sm"
                    className="mt-1.5 shrink-0"
                    onClick={handleSubmit}
                    disabled={saving || !inputValue.trim()}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>

              {/* Auto-detected type badge */}
              <div className="mt-2 flex items-center gap-2">
                {inputValue.trim() && activeMode === 'url' && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      isYoutubeUrl
                        ? 'bg-red-500/10 text-red-600'
                        : 'bg-blue-500/10 text-blue-600'
                    )}
                  >
                    {isYoutubeUrl ? (
                      <Youtube className="h-3 w-3" />
                    ) : (
                      <Globe className="h-3 w-3" />
                    )}
                    {isYoutubeUrl ? 'YouTube' : 'Web link'}
                  </span>
                )}

                {!showTitle && activeMode !== 'file' && (
                  <button
                    type="button"
                    onClick={() => setShowTitle(true)}
                    className="text-muted-foreground inline-flex items-center gap-0.5 text-xs hover:underline"
                  >
                    + Add title
                  </button>
                )}
              </div>

              {showTitle && (
                <div className="mt-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Custom title (optional)"
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ScopeTab)}>
          <TabsList>
            <TabsTrigger value="org">Organization</TabsTrigger>
            <TabsTrigger value="user">Personal</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-4">
            {!docs ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : docs.length === 0 ? (
              <div className="border-muted-foreground/20 text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
                No workspace documents yet. Paste a link or drop a PDF above.
              </div>
            ) : (
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li
                    key={d._id}
                    className="border-border flex items-start justify-between gap-3 rounded-lg border p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                        <span className="truncate font-medium">{d.title}</span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-xs',
                            d.status === 'ready' && 'bg-emerald-500/15 text-emerald-600',
                            d.status === 'error' && 'bg-destructive/15 text-destructive',
                            (d.status === 'pending' || d.status === 'processing') &&
                              'bg-amber-500/15 text-amber-700'
                          )}
                        >
                          {d.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                        {d.type}
                        {d.sourceUrl ? ` · ${d.sourceUrl}` : ''}
                      </p>
                      {d.extractedText && (
                        <p className="mt-2 line-clamp-3 text-sm">{d.extractedText}</p>
                      )}
                      {d.processingError && (
                        <p className="text-destructive mt-1 text-xs">{d.processingError}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => handleDelete(d._id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        {folders && folders.length > 0 && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <FolderOpen className="h-3.5 w-3.5" />
            {folders.length} folder(s) — organize from API or future UI
          </div>
        )}
      </div>

      <ProcessingStatus docs={allDocs} />
    </div>
  )
}
