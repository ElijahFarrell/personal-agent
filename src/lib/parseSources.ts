export interface ParsedSource {
  title: string
  url: string
  domain: string
  favicon: string
}

export interface SourceParseResult {
  content: string
  sources: ParsedSource[]
}

const SOURCES_BLOCK_RE = /:::sources\s*\n([\s\S]*?):::/g
const SOURCE_LINE_RE = /::source\{([^}]+)\}/g

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function buildFavicon(url: string): string {
  const domain = extractDomain(url)
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

function parseSourceJson(raw: string): Partial<ParsedSource> {
  try {
    const obj = JSON.parse(`{${raw}}`)
    return { title: obj.title, url: obj.url }
  } catch {
    const title = raw.match(/"title"\s*:\s*"([^"]*)"/)
    const url = raw.match(/"url"\s*:\s*"([^"]*)"/)
    return { title: title?.[1], url: url?.[1] }
  }
}

/**
 * Strip incomplete :::sources block that's still being streamed.
 * Matches from the last `:::sources` that has no closing `:::`.
 */
const INCOMPLETE_SOURCES_RE = /:::sources\s*\n(?:(?!:::)[\s\S])*$/

function extractSourcesFromBlock(inner: string, sources: ParsedSource[]) {
  let lineMatch: RegExpExecArray | null
  const lineRe = new RegExp(SOURCE_LINE_RE.source, 'g')
  while ((lineMatch = lineRe.exec(inner)) !== null) {
    const parsed = parseSourceJson(lineMatch[1])
    if (parsed.url) {
      sources.push({
        title: parsed.title || extractDomain(parsed.url),
        url: parsed.url,
        domain: extractDomain(parsed.url),
        favicon: buildFavicon(parsed.url),
      })
    }
  }
}

/**
 * Extracts all :::sources blocks from content.
 * Returns the cleaned content (blocks removed) and an array of parsed sources.
 * Also hides incomplete source blocks that are still being streamed.
 */
export function parseSources(content: string): SourceParseResult {
  const sources: ParsedSource[] = []

  let cleaned = content.replace(SOURCES_BLOCK_RE, (_match, inner: string) => {
    extractSourcesFromBlock(inner, sources)
    return ''
  })

  cleaned = cleaned.replace(INCOMPLETE_SOURCES_RE, '')

  return { content: cleaned.trim(), sources }
}
