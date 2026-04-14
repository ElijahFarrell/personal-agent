import { tavily } from '@tavily/core'
import { generateText } from 'ai'
import { extractLinks, extractText, getDocumentProxy } from 'unpdf'
import { config } from '@/lib/config'
import { getYoutubeTranscriptFromUrl } from '@/services/apifyService'
import { Models } from '@/constants/models'
import type { WorkspaceChunkSeed } from '@/services/workspaceKnowledgeService'

const PDF_OCR_PAGE_HEADING = /^##\s*Page\s+(\d+)\s*$/gim

function normalizeExtractedText(value: string): string {
  return value.replace(/\u0000/g, '').replace(/\r\n/g, '\n').trim()
}

function buildSegmentText(segments: WorkspaceChunkSeed[]): string {
  return segments
    .map((segment) => {
      const heading = segment.pageNumber
        ? `## Page ${segment.pageNumber}`
        : segment.reference?.trim()
      return heading ? `${heading}\n${segment.content.trim()}` : segment.content.trim()
    })
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

async function extractScannedPdfWithAi(
  pdfBytes: Uint8Array,
  totalPages: number
): Promise<WorkspaceChunkSeed[]> {
  if (!config.gateway.apiKey.trim()) {
    return []
  }

  const pdfDataUrl = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`
  const { text } = await generateText({
    model: Models.GEMINI_3_FLASH(),
    maxOutputTokens: 12000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Extract all readable text from this PDF. Preserve page boundaries exactly by ' +
              'using Markdown headings in the form "## Page N". Return only the extracted text. ' +
              'If a page has no readable text, include the page heading and the line "[no readable text]".',
          },
          {
            type: 'file',
            data: pdfDataUrl,
            mediaType: 'application/pdf',
          },
        ],
      },
    ],
  })

  const normalized = normalizeExtractedText(text)
  if (!normalized) return []

  const matches = Array.from(normalized.matchAll(PDF_OCR_PAGE_HEADING))
  if (matches.length === 0) {
    return [
      {
        content: normalized,
        reference: totalPages === 1 ? 'Page 1' : 'OCR transcript',
        ...(totalPages === 1 ? { pageNumber: 1 } : {}),
      },
    ]
  }

  const segments: WorkspaceChunkSeed[] = []
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!
    const pageNumber = Number(match[1])
    const start = (match.index ?? 0) + match[0].length
    const end = matches[i + 1]?.index ?? normalized.length
    const content = normalizeExtractedText(normalized.slice(start, end))
    if (!content || content === '[no readable text]') continue
    segments.push({
      content,
      reference: `Page ${pageNumber}`,
      pageNumber,
    })
  }

  return segments
}

async function extractPdfContent(pdfBytes: Uint8Array): Promise<{
  extractedText: string
  segments: WorkspaceChunkSeed[]
  metadata: Record<string, unknown>
}> {
  const pdf = await getDocumentProxy(pdfBytes)
  try {
    const [{ totalPages, text }, linkResult] = await Promise.all([
      extractText(pdf, { mergePages: false }),
      extractLinks(pdf).catch(() => ({ totalPages: 0, links: [] as string[] })),
    ])

    const pageSegments: WorkspaceChunkSeed[] = []
    for (const [index, pageText] of text.entries()) {
      const content = normalizeExtractedText(pageText)
      if (!content) continue
      pageSegments.push({
        content,
        reference: `Page ${index + 1}`,
        pageNumber: index + 1,
      })
    }

    if (pageSegments.length > 0) {
      return {
        extractedText: buildSegmentText(pageSegments),
        segments: pageSegments,
        metadata: {
          totalPages,
          linkCount: linkResult.links.length,
          links: linkResult.links.slice(0, 50),
          extractionMethod: 'unpdf',
          ocrUsed: false,
        },
      }
    }

    const ocrSegments = await extractScannedPdfWithAi(pdfBytes, totalPages)
    if (ocrSegments.length > 0) {
      return {
        extractedText: buildSegmentText(ocrSegments),
        segments: ocrSegments,
        metadata: {
          totalPages,
          linkCount: linkResult.links.length,
          links: linkResult.links.slice(0, 50),
          extractionMethod: 'ai-pdf-fallback',
          ocrUsed: true,
        },
      }
    }

    throw new Error('No text extracted from PDF (including scanned OCR fallback)')
  } finally {
    await pdf.destroy()
  }
}

export interface ProcessExtractResult {
  title?: string
  extractedText: string
  transcript?: string
  segments?: WorkspaceChunkSeed[]
  metadata?: Record<string, unknown>
}

function isYoutubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url)
}

function looksLikeHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

/**
 * Extract searchable text from a workspace document (PDF bytes, YouTube URL, web URL, etc.).
 */
export async function extractWorkspaceContent(input: {
  type: string
  title: string
  sourceUrl?: string
  /** Signed Convex file URL for PDF / media. */
  fileUrl?: string | null
  mimeType?: string
}): Promise<ProcessExtractResult> {
  const { type, title, sourceUrl, fileUrl, mimeType } = input

  if (type === 'youtube' && sourceUrl) {
    const { title: t, transcript } = await getYoutubeTranscriptFromUrl(sourceUrl)
    return {
      title: t || title,
      extractedText: transcript,
      transcript,
      segments: [
        {
          content: transcript,
          reference: sourceUrl,
          sourceUrl,
        },
      ],
    }
  }

  if (type === 'webpage' && sourceUrl && looksLikeHttpUrl(sourceUrl)) {
    const key = config.search.tavilyApiKey
    if (!key?.trim()) {
      throw new Error('TAVILY_API_KEY is required for web page extraction')
    }
    const client = tavily({ apiKey: key })
    const res = await client.extract([sourceUrl], {
      extractDepth: 'advanced',
      format: 'markdown',
    })
    const first = res.results?.[0]
    if (!first?.rawContent?.trim()) {
      throw new Error('Could not extract content from this URL')
    }
    return {
      title: first.title ?? title,
      extractedText: first.rawContent.trim(),
      segments: [
        {
          content: first.rawContent.trim(),
          reference: sourceUrl,
          sourceUrl,
        },
      ],
      metadata: {
        extractionMethod: 'tavily',
        sourceUrl,
      },
    }
  }

  if (type === 'pdf' && fileUrl) {
    const res = await fetch(fileUrl)
    if (!res.ok) throw new Error(`Failed to download PDF (${res.status})`)
    const buf = new Uint8Array(await res.arrayBuffer())
    return await extractPdfContent(buf)
  }

  if ((type === 'text' || type === 'note') && sourceUrl && isYoutubeUrl(sourceUrl)) {
    const { title: t, transcript } = await getYoutubeTranscriptFromUrl(sourceUrl)
    return {
      title: t || title,
      extractedText: transcript,
      transcript,
      segments: [
        {
          content: transcript,
          reference: sourceUrl,
          sourceUrl,
        },
      ],
    }
  }

  if (
    sourceUrl &&
    looksLikeHttpUrl(sourceUrl) &&
    !isYoutubeUrl(sourceUrl) &&
    (type === 'text' || type === 'note')
  ) {
    const key = config.search.tavilyApiKey
    if (!key?.trim()) {
      throw new Error('TAVILY_API_KEY is required for link extraction')
    }
    const client = tavily({ apiKey: key })
    const res = await client.extract([sourceUrl], {
      extractDepth: 'basic',
      format: 'markdown',
    })
    const first = res.results?.[0]
    if (!first?.rawContent?.trim()) {
      throw new Error('Could not extract content from this URL')
    }
    return {
      title: first.title ?? title,
      extractedText: first.rawContent.trim(),
      segments: [
        {
          content: first.rawContent.trim(),
          reference: sourceUrl,
          sourceUrl,
        },
      ],
      metadata: {
        extractionMethod: 'tavily',
        sourceUrl,
      },
    }
  }

  if (mimeType?.startsWith('text/') && fileUrl) {
    const res = await fetch(fileUrl)
    if (!res.ok) throw new Error(`Failed to download file (${res.status})`)
    const extractedText = (await res.text()).trim()
    return {
      extractedText,
      segments: [{ content: extractedText, reference: title }],
    }
  }

  throw new Error(
    'Unsupported document type or missing file URL / source URL for processing'
  )
}
