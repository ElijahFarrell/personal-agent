import type { FileUIPart } from 'ai'
import { API_ROUTES } from '@/constants/api'

/** MIME types we inline as text into the prompt (not vision). */
export function isTextLikeFileMime(mime: string): boolean {
  const m = mime.toLowerCase()
  if (m.startsWith('text/')) return true
  if (
    m === 'application/json' ||
    m === 'application/xml' ||
    m === 'application/javascript' ||
    m === 'application/typescript' ||
    m === 'application/x-yaml' ||
    m === 'application/sql'
  ) {
    return true
  }
  if (m === 'application/csv' || m === 'text/csv') return true
  return false
}

/** Excel / similar — still not inlined in chat (export CSV or paste). */
export function isUnsupportedSpreadsheetMime(mime: string): boolean {
  const m = mime.toLowerCase()
  return m.includes('spreadsheetml') || m === 'application/vnd.ms-excel'
}

function fileLabel(f: FileUIPart): string {
  return f.filename ?? (f as { name?: string }).name ?? 'attachment'
}

function isPdfMime(mime: string, filename: string): boolean {
  return mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')
}

function isDocxMime(mime: string, filename: string): boolean {
  const f = filename.toLowerCase()
  return (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    f.endsWith('.docx')
  )
}

function isLegacyDocMime(mime: string, filename: string): boolean {
  const f = filename.toLowerCase()
  return mime === 'application/msword' || (f.endsWith('.doc') && !f.endsWith('.docx'))
}

async function extractPdfOrDocxText(blob: Blob, filename: string): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  const form = new FormData()
  form.append('file', blob, filename)
  const res = await fetch(API_ROUTES.chatExtractDocument, {
    method: 'POST',
    body: form,
    credentials: 'include',
  })
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string }
  if (!res.ok) {
    return { ok: false, error: data.error ?? 'Could not extract text from document' }
  }
  if (typeof data.text !== 'string') {
    return { ok: false, error: 'Document extraction returned no text' }
  }
  return { ok: true, text: data.text }
}

/**
 * Split prompt attachments into inlined text vs images for the model.
 * Text files are read from data URLs / blob URLs via fetch().text().
 * PDF/DOCX go through `/api/chat/extract-document` (one-time, not workspace).
 */
export async function enrichUserMessageWithAttachments(
  text: string,
  files: FileUIPart[]
): Promise<
  | { ok: true; enrichedText: string; imageFiles: FileUIPart[] }
  | { ok: false; error: string }
> {
  let fileContext = ''
  const imageFiles: FileUIPart[] = []

  for (const f of files) {
    const mime = (f.mediaType ?? (f as { mimeType?: string }).mimeType ?? '').toLowerCase()
    const label = fileLabel(f)

    if (mime.startsWith('image/')) {
      imageFiles.push(f)
      continue
    }
    if (isUnsupportedSpreadsheetMime(mime)) {
      return {
        ok: false,
        error:
          'Spreadsheets are not supported as chat attachments. Export to CSV, paste cells, or add the file to workspace.',
      }
    }
    if (isLegacyDocMime(mime, label)) {
      return {
        ok: false,
        error:
          'Legacy .doc is not supported. Save as .docx or PDF and attach again.',
      }
    }
    if (isPdfMime(mime, label) || isDocxMime(mime, label)) {
      try {
        const blob = await fetch(f.url).then((r) => r.blob())
        const extracted = await extractPdfOrDocxText(blob, label)
        if (!extracted.ok) return extracted
        fileContext += `[File: ${label}]\n${extracted.text}\n\n`
      } catch {
        return { ok: false, error: `Could not read document: ${label}` }
      }
      continue
    }
    if (!isTextLikeFileMime(mime)) {
      return {
        ok: false,
        error: `Unsupported attachment type: ${mime || 'unknown'}. Try PDF, DOCX, images, or plain text/code files.`,
      }
    }
    try {
      const content = await fetch(f.url).then((r) => r.text())
      fileContext += `[File: ${label}]\n${content}\n\n`
    } catch {
      return { ok: false, error: `Could not read file: ${label}` }
    }
  }

  const trimmed = text.trim()
  let enrichedText: string
  if (fileContext) {
    enrichedText = trimmed
      ? `${fileContext}User message: ${trimmed}`
      : `${fileContext}(No additional message.)`
  } else {
    enrichedText = trimmed
  }

  return { ok: true, enrichedText, imageFiles }
}
