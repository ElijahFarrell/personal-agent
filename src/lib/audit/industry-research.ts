/**
 * Industry research for the Free AI Audit.
 *
 * Runs a small set of Tavily queries about the user's industry, distills the
 * results into a markdown brief, and caches it in Convex for 7 days. Used as
 * grounding context for the audit agent so reports cite industry-specific
 * workflows, tools, and AI use cases rather than generic advice.
 */
import type { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { searchTavily, type SearchResult } from '@/services/searchService'
import { INDUSTRY_OPTIONS } from '@/lib/audit/options'

/** Compact brief returned to callers — `sources` is also embedded inside `brief`. */
export type IndustryBrief = {
  industrySlug: string
  industryLabel: string
  brief: string
  sources: { title: string; url: string }[]
  cached: boolean
}

const MAX_SOURCES_IN_BRIEF = 5
const RESULTS_PER_QUERY = 4
const CONTENT_SNIPPET_CHARS = 320

/**
 * Convert a free-text or option-value industry into a stable cache slug.
 * - Option values (`real_estate`, `home_services`, …) pass through.
 * - Free text is lowercased, trimmed, deduped on whitespace, and hyphenated.
 */
export function industryToSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Resolve the user-facing label for an industry value. If they picked an option,
 * return the catalog label; if they typed free text, return the raw text.
 */
export function resolveIndustryLabel(args: {
  industry: string
  industryOther?: string | null
}): string {
  const { industry, industryOther } = args
  if (industry === 'other') {
    return (industryOther ?? '').trim() || 'general business'
  }
  const match = INDUSTRY_OPTIONS.find((o) => o.value === industry)
  return match?.label ?? industry
}

/**
 * Build the canonical cache key for an industry. For free text we slugify the
 * user's words; for catalog values we slugify the option value itself so two
 * users picking "real_estate" share a brief.
 */
export function resolveIndustrySlug(args: {
  industry: string
  industryOther?: string | null
}): string {
  if (args.industry === 'other') {
    const slug = industryToSlug(args.industryOther ?? '')
    return slug || 'general-business'
  }
  return industryToSlug(args.industry) || 'general-business'
}

/** Templated queries that consistently surface useful business-context results. */
function buildResearchQueries(industryLabel: string): string[] {
  return [
    `Most time-consuming manual workflows in ${industryLabel} small and mid-sized businesses`,
    `Common AI automation use cases and case studies in ${industryLabel}`,
    `Typical software stack and tools used by ${industryLabel} operators (CRM, ops, marketing)`,
  ]
}

/** Truncate a snippet so the assembled brief fits comfortably in the prompt. */
function snippet(content: string): string {
  const trimmed = content.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= CONTENT_SNIPPET_CHARS) return trimmed
  return `${trimmed.slice(0, CONTENT_SNIPPET_CHARS - 1).trimEnd()}…`
}

/**
 * Distill raw Tavily results into a compact markdown brief. We don't ask an LLM
 * to summarize — the audit agent itself reads the brief, so a structured digest
 * of titles + snippets is enough grounding context and keeps cost predictable.
 */
function buildBriefMarkdown(args: {
  industryLabel: string
  sections: { question: string; results: SearchResult[] }[]
  sources: { title: string; url: string }[]
}): string {
  const lines: string[] = []
  lines.push(`# Industry Research Brief — ${args.industryLabel}`)
  lines.push('')
  lines.push(
    `_Auto-generated context from recent web research. Use it to ground recommendations in this industry's real workflows, tools, and AI use cases. Do not quote it verbatim or expose URLs to the reader._`
  )
  lines.push('')

  for (const section of args.sections) {
    lines.push(`## ${section.question}`)
    if (section.results.length === 0) {
      lines.push('_No results returned._')
    } else {
      for (const r of section.results) {
        const title = r.title?.trim() || r.url
        lines.push(`- **${title}** — ${snippet(r.content || '')}`)
      }
    }
    lines.push('')
  }

  if (args.sources.length > 0) {
    lines.push('## Sources')
    for (const s of args.sources) {
      lines.push(`- ${s.title || s.url} (${s.url})`)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * Run the Tavily queries and produce a fresh brief. Failures inside individual
 * queries are tolerated — we degrade to whatever results we did get rather
 * than blocking the audit submission entirely.
 */
async function generateFreshBrief(args: {
  industrySlug: string
  industryLabel: string
}): Promise<{
  brief: string
  sources: { title: string; url: string }[]
  metadata: Record<string, unknown>
}> {
  const queries = buildResearchQueries(args.industryLabel)
  const sections: { question: string; results: SearchResult[] }[] = []
  const seenUrls = new Set<string>()
  const sources: { title: string; url: string }[] = []

  for (const q of queries) {
    try {
      const results = await searchTavily(q, {
        searchDepth: 'basic',
        maxResults: RESULTS_PER_QUERY,
      })
      sections.push({ question: q, results })
      for (const r of results) {
        if (!r.url || seenUrls.has(r.url)) continue
        seenUrls.add(r.url)
        if (sources.length < MAX_SOURCES_IN_BRIEF) {
          sources.push({ title: r.title || r.url, url: r.url })
        }
      }
    } catch (err) {
      console.warn('[industry-research] tavily query failed', {
        query: q,
        error: err instanceof Error ? err.message : String(err),
      })
      sections.push({ question: q, results: [] })
    }
  }

  const brief = buildBriefMarkdown({
    industryLabel: args.industryLabel,
    sections,
    sources,
  })

  return {
    brief,
    sources,
    metadata: {
      generatedAt: new Date().toISOString(),
      queryCount: queries.length,
      sectionsWithResults: sections.filter((s) => s.results.length > 0).length,
    },
  }
}

/**
 * Read-through cache for industry briefs. Pass a `ConvexHttpClient` so this
 * helper stays usable from any Next.js route or server action.
 *
 * Behavior:
 * 1. If a fresh row exists (TTL valid) → return it (`cached: true`).
 * 2. Otherwise generate, persist, and return the new brief.
 * 3. On generation failure, fall back to a stale cached row if available, then
 *    finally to `null` so callers can choose to proceed without grounding.
 */
export async function getOrCreateIndustryBrief(args: {
  convex: ConvexHttpClient
  industry: string
  industryOther?: string | null
}): Promise<IndustryBrief | null> {
  const industrySlug = resolveIndustrySlug({
    industry: args.industry,
    industryOther: args.industryOther,
  })
  const industryLabel = resolveIndustryLabel({
    industry: args.industry,
    industryOther: args.industryOther,
  })

  const cached = await args.convex.query(api.industryBriefs.getBySlug, {
    industrySlug,
  })
  if (cached?.isFresh) {
    return {
      industrySlug: cached.industrySlug,
      industryLabel: cached.industryLabel,
      brief: cached.brief,
      sources: cached.sources,
      cached: true,
    }
  }

  try {
    const fresh = await generateFreshBrief({ industrySlug, industryLabel })
    await args.convex.mutation(api.industryBriefs.upsert, {
      industrySlug,
      industryLabel,
      brief: fresh.brief,
      sources: fresh.sources,
      metadata: fresh.metadata,
    })
    return {
      industrySlug,
      industryLabel,
      brief: fresh.brief,
      sources: fresh.sources,
      cached: false,
    }
  } catch (err) {
    console.error('[industry-research] generation failed', err)
    if (cached) {
      return {
        industrySlug: cached.industrySlug,
        industryLabel: cached.industryLabel,
        brief: cached.brief,
        sources: cached.sources,
        cached: true,
      }
    }
    return null
  }
}
