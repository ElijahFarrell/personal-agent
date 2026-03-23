/**
 * Composio SEARCH_API tool slugs and helpers.
 * @see https://docs.composio.dev/toolkits/search_api
 */
export const SEARCH_API_TOOLS = {
  SEARCH: 'SEARCH_API_SEARCH',
  GET_CACHED_JSON: 'SEARCH_API_GET_CACHED_SEARCH_BY_ID',
} as const

export interface SearchApiSearchArgs {
  q: string
  engine: string
  gl?: string
  hl?: string
  page?: number
  num?: number
}
