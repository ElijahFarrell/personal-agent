import { executeComposioTool } from '@/lib/composio'
import { SEARCH_API_TOOLS } from './searchApiAdapter'

/**
 * Fetches cached JSON for a prior SEARCH_API_SEARCH by id.
 */
export async function getCachedSearchJson(
  clerkUserId: string,
  searchId: string
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const result = await executeComposioTool<unknown>(clerkUserId, SEARCH_API_TOOLS.GET_CACHED_JSON, {
    search_id: searchId,
  })
  if (!result.successful) {
    return { ok: false, error: result.error ?? 'cached fetch failed' }
  }
  return { ok: true, data: result.data }
}
