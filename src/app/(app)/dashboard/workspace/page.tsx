'use client'

import { useState, useCallback, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import {
  FileText,
  FolderOpen,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { API_ROUTES } from '@/constants/api'
import { WORKSPACE_DOC_STATUS, WORKSPACE_DOC_TYPE } from '@convex/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type ScopeTab = 'org' | 'user'

function detectTypeFromUrl(url: string): 'youtube' | 'webpage' {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  return 'webpage'
}

export default function WorkspacePage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState<ScopeTab>('org')
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState<'note' | 'url' | 'file'>('note')
  const [title, setTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [processingId, setProcessingId] = useState<Id<'workspaceDocuments'> | null>(null)
  const [migrating, setMigrating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const resetForm = useCallback(() => {
    setTitle('')
    setNoteBody('')
    setLinkUrl('')
    setAddMode('note')
  }, [])

  const handleSaveNote = async () => {
    if (!dbUser || !title.trim()) return
    setSaving(true)
    try {
      const docId = await createDoc({
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
        scope: activeTab,
        title: title.trim(),
        type: WORKSPACE_DOC_TYPE.NOTE,
        extractedText: noteBody.trim(),
        status: WORKSPACE_DOC_STATUS.READY,
      })
      await fetch(API_ROUTES.workspaceIndexDoc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId }),
      })
      setShowAdd(false)
      resetForm()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveUrl = async () => {
    if (!dbUser || !linkUrl.trim()) return
    setSaving(true)
    try {
      const url = linkUrl.trim()
      const t = title.trim() || url
      const type =
        detectTypeFromUrl(url) === 'youtube'
          ? WORKSPACE_DOC_TYPE.YOUTUBE
          : WORKSPACE_DOC_TYPE.WEBPAGE
      const docId = await createDoc({
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
        scope: activeTab,
        title: t,
        type,
        sourceUrl: url,
        status: WORKSPACE_DOC_STATUS.PENDING,
      })
      setProcessingId(docId)
      const res = await fetch(API_ROUTES.workspaceProcess, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.warn('Process failed', err)
      }
      setShowAdd(false)
      resetForm()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
      setProcessingId(null)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !dbUser) return
    setSaving(true)
    try {
      const postUrl = await genUploadUrl({
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
      })
      const put = await fetch(postUrl, { method: 'POST', body: file })
      const json = (await put.json()) as { storageId: string }
      const docId = await createDoc({
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
        scope: activeTab,
        title: title.trim() || file.name,
        type: WORKSPACE_DOC_TYPE.PDF,
        storageId: json.storageId as Id<'_storage'>,
        mimeType: file.type || 'application/pdf',
        fileSize: file.size,
        status: WORKSPACE_DOC_STATUS.PENDING,
      })
      setProcessingId(docId)
      const res = await fetch(API_ROUTES.workspaceProcess, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.warn('Process failed', err)
      }
      setShowAdd(false)
      resetForm()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
      setProcessingId(null)
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
        alert(`Imported ${data.imported ?? 0}, indexed ${data.indexed ?? 0}`)
      } else {
        alert(data.error ?? 'Migration failed')
      }
    } finally {
      setMigrating(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Upload PDFs, paste YouTube or web links, and notes — indexed for AI chat and agents.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleMigrate} disabled={migrating}>
              {migrating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Migrate from Context
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ScopeTab)}>
          <TabsList>
            <TabsTrigger value="org">Organization</TabsTrigger>
            <TabsTrigger value="user">Personal</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-4">
            {!docs ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : docs.length === 0 ? (
              <div className="border-muted-foreground/20 text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
                No workspace documents yet. Add a note, link, or PDF.
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title (optional for files)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            </div>
            <Select value={addMode} onValueChange={(v) => setAddMode(v as typeof addMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Text note</SelectItem>
                <SelectItem value="url">YouTube or web link</SelectItem>
                <SelectItem value="file">PDF upload</SelectItem>
              </SelectContent>
            </Select>

            {addMode === 'note' && (
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={6}
                  placeholder="Notes to index for AI…"
                />
              </div>
            )}

            {addMode === 'url' && (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            )}

            {addMode === 'file' && (
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileRef.current?.click()}
                  disabled={saving}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose PDF
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            {addMode === 'note' && (
              <Button onClick={handleSaveNote} disabled={saving || !title.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & index'}
              </Button>
            )}
            {addMode === 'url' && (
              <Button onClick={handleSaveUrl} disabled={saving || !linkUrl.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import & process'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {processingId && (
        <span className="sr-only" aria-live="polite">
          Processing document…
        </span>
      )}
    </div>
  )
}
