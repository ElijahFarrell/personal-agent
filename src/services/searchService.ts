import { tavily } from '@tavily/core'
import Exa from 'exa-js'
import { config } from '@/lib/config'

/** Unified search result shape for both Tavily and Exa. */
export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
}

/** Options for Tavily search. */
export interface TavilySearchOptions {
  searchDepth?: 'basic' | 'advanced' | 'fast' | 'ultra-fast'
  maxResults?: number
}

/** Options for Exa search. */
export interface ExaSearchOptions {
  numResults?: number
  maxCharacters?: number
}

/** Extended options for deep Exa research with filtering. */
export interface ExaDeepSearchOptions {
  numResults?: number
  maxCharacters?: number
  category?: 'news' | 'research paper' | 'financial report' | 'company' | 'tweet'
  includeDomains?: string[]
  excludeDomains?: string[]
  startPublishedDate?: string
  endPublishedDate?: string
  maxAgeHours?: number
}

const tavilyClient = config.search.tavilyApiKey
  ? tavily({ apiKey: config.search.tavilyApiKey })
  : null

const exaClient = config.search.exaApiKey
  ? new Exa(config.search.exaApiKey)
  : null

function toSearchResult(
  title: string,
  url: string,
  content: string,
  score: number
): SearchResult {
  return { title, url, content, score }
}

/**
 * Searches the web using Tavily. Optimized for high-volume, fast queries.
 *
 * @param query - Search query
 * @param options - Optional search depth and result limit
 * @returns Array of search results
 */
export async function searchTavily(
  query: string,
  options?: TavilySearchOptions
): Promise<SearchResult[]> {
  if (!tavilyClient) throw new Error('Tavily API key is not configured')

  const response = await tavilyClient.search(query, {
    searchDepth: options?.searchDepth ?? 'basic',
    maxResults: options?.maxResults ?? 5,
  })

  const results = response.results ?? []
  return results.map((r) =>
    toSearchResult(r.title ?? '', r.url ?? '', r.content ?? '', r.score ?? 0)
  )
}

/**
 * Searches the web using Exa for deeper research with richer content.
 *
 * @param query - Search query
 * @param options - Optional result count and content length
 * @returns Array of search results with extracted page content
 */
export async function searchExa(
  query: string,
  options?: ExaSearchOptions
): Promise<SearchResult[]> {
  if (!exaClient) throw new Error('Exa API key is not configured')

  const response = await exaClient.search(query, {
    numResults: options?.numResults ?? 5,
    contents: {
      text: { maxCharacters: options?.maxCharacters ?? 1000 },
    },
  })

  const results = response.results ?? []
  return results.map((r) => {
    const text = (r as { text?: string }).text ?? ''
    const score = r.score ?? 0
    return toSearchResult(r.title ?? '', r.url ?? '', text, score)
  })
}

/**
 * Deep Exa search with full filtering: category, domain include/exclude,
 * date range, and content freshness control via maxAgeHours.
 */
export async function searchExaDeep(
  query: string,
  options: ExaDeepSearchOptions = {}
): Promise<SearchResult[]> {
  if (!exaClient) throw new Error('Exa API key is not configured')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchParams: Record<string, any> = {
    numResults: options.numResults ?? 10,
    contents: {
      text: { maxCharacters: options.maxCharacters ?? 3000 },
    },
  }

  if (options.category) searchParams.category = options.category
  if (options.includeDomains?.length) searchParams.includeDomains = options.includeDomains
  if (options.excludeDomains?.length) searchParams.excludeDomains = options.excludeDomains
  if (options.startPublishedDate) searchParams.startPublishedDate = options.startPublishedDate
  if (options.endPublishedDate) searchParams.endPublishedDate = options.endPublishedDate
  if (options.maxAgeHours !== undefined) searchParams.maxAgeHours = options.maxAgeHours

  const response = await exaClient.search(query, searchParams)
  const results = response.results ?? []
  return results.map((r) => {
    const text = (r as { text?: string }).text ?? ''
    const score = r.score ?? 0
    return toSearchResult(r.title ?? '', r.url ?? '', text, score)
  })
}

/**
 * Unified search that picks the right engine based on type.
 * 'fast' uses Tavily for quick lookups; 'deep' uses Exa for research.
 */
export async function search(
  query: string,
  type: 'fast' | 'deep'
): Promise<SearchResult[]> {
  if (type === 'fast') {
    return searchTavily(query, { searchDepth: 'basic', maxResults: 5 })
  }
  return searchExa(query, { numResults: 5, maxCharacters: 1000 })
}
