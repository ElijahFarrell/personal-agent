import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import { getTenantContext } from '@/middleware/tenantContext'

export const maxDuration = 120

const MAX_BYTES = 20 * 1024 * 1024
const MAX_OUTPUT_CHARS = 300_000

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * One-time extraction of plain text from PDF or DOCX for chat attachments
 * (not indexed to workspace).
 */
export async function POST(req: NextRequest) {
  try {
    await getTenantContext()

    const form = await req.formData()
    const entry = form.get('file')
    if (!entry || !(entry instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (entry.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${Math.floor(MAX_BYTES / 1024 / 1024)} MB).` },
        { status: 400 }
      )
    }

    const mime = (entry.type || '').toLowerCase()
    const name = entry.name || 'document'
    const lower = name.toLowerCase()
    const buf = Buffer.from(await entry.arrayBuffer())

    let text: string

    if (mime === PDF_MIME || lower.endsWith('.pdf')) {
      const parser = new PDFParse({ data: buf })
      try {
        const result = await parser.getText()
        text = result.text
      } finally {
        await parser.destroy()
      }
    } else if (mime === DOCX_MIME || lower.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: buf })
      text = result.value
    } else if (mime === 'application/msword' || lower.endsWith('.doc')) {
      return NextResponse.json(
        {
          error:
            'Legacy .doc is not supported. Save as .docx or PDF and attach again.',
        },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        { error: 'Unsupported type. Use PDF or .docx.' },
        { status: 400 }
      )
    }

    const trimmed = text.trim()
    const out =
      trimmed.length > MAX_OUTPUT_CHARS
        ? `${trimmed.slice(0, MAX_OUTPUT_CHARS)}\n\n[Truncated — document text exceeded the per-request limit.]`
        : trimmed

    return NextResponse.json({ text: out })
  } catch (err) {
    console.error('[extract-document]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Extraction failed' },
      { status: 500 }
    )
  }
}
