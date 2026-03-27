/**
 * Gmail API payload → plain text (shared by inbox sync + live thread fetch).
 */
import { looksLikeHtml, stripHtmlToText } from '@/lib/inboxEmailText'

export function decodeBase64UrlBody(data: string): string {
  try {
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(normalized, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

export function extractPlainTextFromGmailPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const p = payload as Record<string, unknown>
  const mimeRoot = String(p.mimeType ?? '').toLowerCase()
  const body = p.body as { data?: string } | undefined
  if (body?.data) {
    const t = decodeBase64UrlBody(body.data)
    if (t.trim()) {
      if (mimeRoot.includes('html') || looksLikeHtml(t)) return stripHtmlToText(t)
      return t
    }
  }
  const parts = p.parts as Array<Record<string, unknown>> | undefined
  if (!parts?.length) return ''

  const preferPlain = (): string => {
    for (const part of parts) {
      const mt = String(part.mimeType ?? '').toLowerCase()
      if (mt !== 'text/plain') continue
      const b = part.body as { data?: string } | undefined
      if (b?.data) {
        const raw = decodeBase64UrlBody(b.data)
        if (raw.trim()) return raw
      }
    }
    for (const part of parts) {
      const mt = String(part.mimeType ?? '').toLowerCase()
      if (mt !== 'text/html') continue
      const b = part.body as { data?: string } | undefined
      if (b?.data) {
        const raw = decodeBase64UrlBody(b.data)
        if (raw.trim()) return stripHtmlToText(raw)
      }
    }
    return ''
  }

  const direct = preferPlain()
  if (direct) return direct

  for (const part of parts) {
    const nested = part.parts as Array<Record<string, unknown>> | undefined
    if (nested?.length) {
      const inner = extractPlainTextFromGmailPayload({ parts: nested })
      if (inner.trim()) return inner
    }
    const mt = String(part.mimeType ?? '').toLowerCase()
    if (mt.includes('multipart')) {
      const inner = extractPlainTextFromGmailPayload(part)
      if (inner.trim()) return inner
    }
  }
  return ''
}

export function deepExtractPlainFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const p = payload as Record<string, unknown>
  const mime = String(p.mimeType ?? '').toLowerCase()
  const body = p.body as { data?: string } | undefined
  if (body?.data) {
    const raw = decodeBase64UrlBody(body.data)
    if (raw.trim()) {
      if (mime.includes('html') || looksLikeHtml(raw)) return stripHtmlToText(raw)
      return raw
    }
  }
  const parts = p.parts as Array<Record<string, unknown>> | undefined
  if (!parts?.length) return ''
  for (const part of parts) {
    const inner = deepExtractPlainFromPayload(part)
    if (inner.trim()) return inner
  }
  return ''
}

export function extractGmailMessagesFromToolData(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') return []
  const d = data as Record<string, unknown>
  if (Array.isArray(d.messages)) {
    return d.messages as Record<string, unknown>[]
  }
  const nested = d.data as Record<string, unknown> | undefined
  if (nested && Array.isArray(nested.messages)) {
    return nested.messages as Record<string, unknown>[]
  }
  const responseData = nested?.response_data as Record<string, unknown> | undefined
  if (responseData && Array.isArray(responseData.messages)) {
    return responseData.messages as Record<string, unknown>[]
  }
  const inner = (d.data as Record<string, unknown> | undefined)?.response_data as
    | Record<string, unknown>
    | undefined
  if (inner?.messages && Array.isArray(inner.messages)) {
    return inner.messages as Record<string, unknown>[]
  }
  if (inner?.value && Array.isArray(inner.value)) {
    return inner.value as Record<string, unknown>[]
  }
  return []
}
