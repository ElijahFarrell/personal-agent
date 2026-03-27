/**
 * Plain-text helpers for inbox sync + UI (Gmail often returns HTML bodies or snippets).
 */

export function looksLikeHtml(s: string): boolean {
  const t = s.trim().slice(0, 400).toLowerCase()
  if (t.startsWith('<!doctype') || t.startsWith('<html')) return true
  if (t.includes('<head') && t.includes('<body')) return true
  if (t.startsWith('<') && /<(br|div|p|span|table|style)\b/i.test(t)) return true
  return false
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Use for stored bodies and thread list snippets — never show raw HTML. */
export function normalizeEmailPlainText(s: string): string {
  const t = s.trim()
  if (!t) return ''
  if (looksLikeHtml(t)) return stripHtmlToText(t)
  return t
}

/** Short line for thread list; prefers Gmail snippet when it is plain text. */
export function threadListSnippet(gmailSnippet: string, bodyPlain: string, max = 200): string {
  const g = normalizeEmailPlainText(gmailSnippet)
  const b = normalizeEmailPlainText(bodyPlain)
  const source = g.length > 0 ? g : b
  if (!source) return ''
  return source.length > max ? `${source.slice(0, max)}…` : source
}
