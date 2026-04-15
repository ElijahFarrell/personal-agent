import type { FileUIPart } from 'ai'

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

/** PDF / Office — not supported in chat composer yet (use workspace). */
export function isUnsupportedDocumentMime(mime: string): boolean {
  const m = mime.toLowerCase()
  return (
    m === 'application/pdf' ||
    m.includes('wordprocessingml') ||
    m === 'application/msword' ||
    m.includes('spreadsheetml') ||
    m === 'application/vnd.ms-excel'
  )
}

function fileLabel(f: FileUIPart): string {
  return f.filename ?? (f as { name?: string }).name ?? 'attachment'
}

/**
 * Split prompt attachments into inlined text vs images for the model.
 * Text files are read from data URLs / blob URLs via fetch().text().
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
    if (mime.startsWith('image/')) {
      imageFiles.push(f)
      continue
    }
    if (isUnsupportedDocumentMime(mime)) {
      return {
        ok: false,
        error:
          'PDF and Office documents are not supported as chat attachments yet. Add them to workspace or paste the text.',
      }
    }
    if (!isTextLikeFileMime(mime)) {
      return {
        ok: false,
        error: `Unsupported attachment type: ${mime || 'unknown'}. Try images or plain text/code files.`,
      }
    }
    try {
      const content = await fetch(f.url).then((r) => r.text())
      fileContext += `[File: ${fileLabel(f)}]\n${content}\n\n`
    } catch {
      return { ok: false, error: `Could not read file: ${fileLabel(f)}` }
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
