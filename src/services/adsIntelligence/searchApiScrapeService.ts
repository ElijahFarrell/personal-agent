import { executeComposioTool } from '@/lib/composio'
import type { SearchApiEngine } from './contracts'
import { SEARCH_API_TOOLS, type SearchApiSearchArgs } from './searchApiAdapter'
import type { AdsScrapeResult, SearchApiCacheRef } from './contracts'

function extractSearchId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const meta = d.search_metadata
  if (meta && typeof meta === 'object') {
    const id = (meta as Record<string, unknown>).id
    if (typeof id === 'string' && id.length > 0) return id
  }
  return null
}

export async function searchOneEngine(
  clerkUserId: string,
  args: SearchApiSearchArgs
): Promise<SearchApiCacheRef> {
  const result = await executeComposioTool<Record<string, unknown>>(
    clerkUserId,
    SEARCH_API_TOOLS.SEARCH,
    args as unknown as Record<string, unknown>
  )
  if (!result.successful) {
    return {
      engine: args.engine,
      searchId: '',
      ok: false,
      error: result.error ?? 'SEARCH_API_SEARCH failed',
    }
  }
  const searchId = extractSearchId(result.data) ?? ''
  if (!searchId) {
    return {
      engine: args.engine,
      searchId: '',
      ok: false,
      error: 'No search_metadata.id in response',
    }
  }
  return { engine: args.engine, searchId, ok: true }
}

/**
 * Runs SEARCH_API_SEARCH in parallel for each engine (Promise.all).
 */
export async function scrapeEnginesParallel(
  clerkUserId: string,
  query: string,
  engines: SearchApiEngine[]
): Promise<AdsScrapeResult> {
  const unique = [...new Set(engines)]
  const tasks = unique.map((engine) =>
    searchOneEngine(clerkUserId, { q: query, engine })
  )
  const refs = await Promise.all(tasks)
  const completedEngines = refs.filter((r) => r.ok).map((r) => r.engine)
  return {
    refs,
    requestedEngines: unique,
    completedEngines,
  }
}
