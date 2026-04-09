import { tavily } from '@tavily/core'
import { PDFParse } from 'pdf-parse'
import { config } from '@/lib/config'
import { getYoutubeTranscriptFromUrl } from '@/services/apifyService'

export interface ProcessExtractResult {
  title?: string
  extractedText: string
  transcript?: string
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
    }
  }

  if (type === 'pdf' && fileUrl) {
    const res = await fetch(fileUrl)
    if (!res.ok) throw new Error(`Failed to download PDF (${res.status})`)
    const buf = new Uint8Array(await res.arrayBuffer())
    const parser = new PDFParse({ data: buf })
    try {
      const textResult = await parser.getText()
      const extractedText = textResult.text?.trim() ?? ''
      if (!extractedText) {
        throw new Error('No text extracted from PDF (may be image-only)')
      }
      return { extractedText }
    } finally {
      await parser.destroy()
    }
  }

  if ((type === 'text' || type === 'note') && sourceUrl && isYoutubeUrl(sourceUrl)) {
    const { title: t, transcript } = await getYoutubeTranscriptFromUrl(sourceUrl)
    return {
      title: t || title,
      extractedText: transcript,
      transcript,
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
    }
  }

  if (mimeType?.startsWith('text/') && fileUrl) {
    const res = await fetch(fileUrl)
    if (!res.ok) throw new Error(`Failed to download file (${res.status})`)
    const extractedText = (await res.text()).trim()
    return { extractedText }
  }

  throw new Error(
    'Unsupported document type or missing file URL / source URL for processing'
  )
}
