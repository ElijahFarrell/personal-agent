'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { X, Upload, FileSpreadsheet, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PROSPECT_FIELDS = [
  { id: 'name', label: 'Name', required: true },
  { id: 'company', label: 'Company', required: false },
  { id: 'email', label: 'Email', required: false },
  { id: 'phone', label: 'Phone', required: false },
  { id: 'linkedinUrl', label: 'LinkedIn URL', required: false },
  { id: 'websiteUrl', label: 'Website URL', required: false },
  { id: 'notes', label: 'Notes', required: false },
] as const

const SKIP = '__skip__'

type FieldId = (typeof PROSPECT_FIELDS)[number]['id']

const HEADER_ALIASES: Record<string, FieldId> = {
  name: 'name',
  fullname: 'name',
  full_name: 'name',
  contact: 'name',
  company: 'company',
  organization: 'company',
  org: 'company',
  email: 'email',
  e_mail: 'email',
  mail: 'email',
  phone: 'phone',
  telephone: 'phone',
  mobile: 'phone',
  linkedin: 'linkedinUrl',
  linkedin_url: 'linkedinUrl',
  linkedinurl: 'linkedinUrl',
  website: 'websiteUrl',
  website_url: 'websiteUrl',
  url: 'websiteUrl',
  notes: 'notes',
  note: 'notes',
  comments: 'notes',
}

function autoMapHeader(header: string): FieldId | typeof SKIP {
  const normalized = header.trim().toLowerCase().replace(/\s+/g, '_')
  const mapped = HEADER_ALIASES[normalized]
  if (mapped) return mapped
  if (HEADER_ALIASES[normalized.replace(/_/g, '')]) return HEADER_ALIASES[normalized.replace(/_/g, '')]
  return SKIP
}

interface ImportProspectsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: Id<'tenants'>
  ownerId?: Id<'users'>
}

type Step = 'upload' | 'map' | 'confirm'

export function ImportProspectsModal({
  open,
  onOpenChange,
  tenantId,
  ownerId,
}: ImportProspectsModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, FieldId | typeof SKIP>>({})
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)

  const importProspects = useMutation(api.prospects.importProspects)

  const reset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setHeaders([])
    setRows([])
    setColumnMap({})
    setError('')
    setImporting(false)
    setImportedCount(null)
  }, [])

  const close = useCallback(() => {
    reset()
    onOpenChange(false)
  }, [onOpenChange, reset])

  const parseFile = useCallback((f: File) => {
    setError('')
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const data = result.data as Record<string, string>[]
          if (data.length === 0) {
            setError('File has no data rows')
            return
          }
          const h = Object.keys(data[0])
          setHeaders(h)
          setRows(data)
          const map: Record<string, FieldId | typeof SKIP> = {}
          for (const header of h) {
            map[header] = autoMapHeader(header)
          }
          setColumnMap(map)
          setFile(f)
          setStep('map')
        },
        error: (err) => setError(err.message ?? 'Failed to parse CSV'),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          if (!data) {
            setError('Failed to read file')
            return
          }
          const wb = XLSX.read(data, { type: 'binary' })
          const firstSheet = wb.SheetNames[0]
          const ws = wb.Sheets[firstSheet]
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
          if (json.length === 0) {
            setError('File has no data rows')
            return
          }
          const h = Object.keys(json[0])
          setHeaders(h)
          setRows(json.map((r) => {
            const out: Record<string, string> = {}
            for (const k of Object.keys(r)) {
              out[k] = String(r[k] ?? '').trim()
            }
            return out
          }))
          const map: Record<string, FieldId | typeof SKIP> = {}
          for (const header of h) {
            map[header] = autoMapHeader(header)
          }
          setColumnMap(map)
          setFile(f)
          setStep('map')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to parse Excel')
        }
      }
      reader.readAsBinaryString(f)
    } else {
      setError('Unsupported format. Use .csv, .xlsx, or .xls')
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const f = e.dataTransfer.files[0]
      if (f) parseFile(f)
    },
    [parseFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) parseFile(f)
      e.target.value = ''
    },
    [parseFile]
  )

  const mappedRows = rows.map((row) => {
    const out: Record<string, string> = {}
    for (const [header, fieldId] of Object.entries(columnMap)) {
      if (fieldId !== SKIP && row[header] !== undefined) {
        out[fieldId] = String(row[header] ?? '').trim()
      }
    }
    return out
  })

  const validRows = mappedRows.filter((r) => r.name?.trim())
  const hasNameColumn = headers.some((h) => columnMap[h] === 'name')

  const handleImport = useCallback(async () => {
    if (!hasNameColumn || validRows.length === 0) return
    setImporting(true)
    setError('')
    try {
      const toInsert = validRows.map((r) => ({
        name: r.name!,
        company: r.company || undefined,
        email: r.email || undefined,
        phone: r.phone || undefined,
        linkedinUrl: r.linkedinUrl || undefined,
        websiteUrl: r.websiteUrl || undefined,
        notes: r.notes || undefined,
      }))
      const count = await importProspects({
        tenantId,
        ownerId,
        rows: toInsert,
      })
      setImportedCount(count)
      setStep('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }, [hasNameColumn, validRows, importProspects, tenantId, ownerId])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && close()}
      role="dialog"
      aria-modal="true"
      aria-label="Import prospects"
    >
      <div className="mx-4 flex w-full max-w-2xl flex-col rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800/60 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Import Prospects</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {error && (
            <p
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
              role="alert"
            >
              {error}
            </p>
          )}

          {step === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/40 py-16 transition-colors hover:border-gray-600"
            >
              <Upload className="mb-4 h-12 w-12 text-gray-500" />
              <p className="mb-2 text-sm font-medium text-gray-300">
                Drop a CSV or Excel file here
              </p>
              <p className="mb-4 text-xs text-gray-500">
                Supports .csv, .xlsx, .xls
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="sr-only"
                />
                <span className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500">
                  <FileSpreadsheet className="h-4 w-4" />
                  Choose file
                </span>
              </label>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Map your columns to prospect fields. At least one column must be mapped to Name.
              </p>
              <div className="space-y-3">
                {headers.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/40 px-4 py-3"
                  >
                    <span className="min-w-[120px] truncate text-sm text-gray-400">
                      {header}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-600" />
                    <Select
                      value={columnMap[header] ?? SKIP}
                      onValueChange={(v) =>
                        setColumnMap((prev) => ({ ...prev, [header]: v as FieldId | typeof SKIP }))
                      }
                    >
                      <SelectTrigger className="h-8 w-[180px] border-gray-700 bg-gray-900">
                        <SelectValue placeholder="Skip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP}>Skip</SelectItem>
                        {PROSPECT_FIELDS.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.label}
                            {f.required ? ' *' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {validRows.length} of {rows.length} rows will be imported
                {!hasNameColumn && ' — map a column to Name to continue'}
              </p>
            </div>
          )}

          {step === 'confirm' && importedCount !== null && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                <Check className="h-7 w-7 text-green-500" />
              </div>
              <p className="text-lg font-medium text-white">
                Imported {importedCount} prospect{importedCount === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Your prospects are now in the table.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-800/60 px-6 py-4">
          {step === 'upload' && (
            <Button variant="outline" onClick={close} className="border-gray-700">
              Cancel
            </Button>
          )}
          {step === 'map' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="border-gray-700"
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={!hasNameColumn || validRows.length === 0 || importing}
                className="bg-brand-600 hover:bg-brand-500"
              >
                {importing ? 'Importing…' : `Import ${validRows.length} prospects`}
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <Button onClick={close} className="bg-brand-600 hover:bg-brand-500">
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
