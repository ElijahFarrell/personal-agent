/**
 * LinkedIn automation via linkedapi.io (production-safe, handles browser sessions).
 * Base URL: https://api.linkedapi.io
 * Auth: linked-api-token and identification-token headers.
 */
import { config } from '@/lib/config'
import type { LinkedInProfile, LinkedInDMParams } from '@/types'

const BASE_URL = 'https://api.linkedapi.io'

function getAuthHeaders(): Record<string, string> {
  const apiKey = config.linkedin.apiKey
  if (!apiKey?.trim()) {
    throw new Error(
      'LinkedIn API is not configured. Set LINKEDAPI_KEY in your environment. ' +
        'Obtain tokens from https://app.linkedapi.io'
    )
  }
  return {
    'linked-api-token': apiKey,
    'identification-token': apiKey,
    'Content-Type': 'application/json',
  }
}

interface WorkflowResponse {
  success: boolean
  result?: { workflowId?: string; [key: string]: unknown }
  error?: { type: string; message: string }
}

interface WorkflowStatusResponse {
  success: boolean
  result?: {
    workflowStatus?: 'running' | 'completed' | 'failed'
    completion?: {
      success?: boolean
      data?: unknown
      error?: { type: string; message: string }
    }
    failure?: { reason: string; message: string }
    [key: string]: unknown
  }
  error?: { type: string; message: string }
}

async function executeWorkflow<T = unknown>(
  action: Record<string, unknown>
): Promise<{ data: T; error?: { type: string; message: string } }> {
  const headers = getAuthHeaders()
  const res = await fetch(`${BASE_URL}/workflows`, {
    method: 'POST',
    headers,
    body: JSON.stringify(action),
  })

  const body = (await res.json()) as WorkflowResponse
  if (!body.success || !body.result?.workflowId) {
    const err = body.error ?? { type: 'unknown', message: 'Workflow start failed' }
    throw new Error(`LinkedIn API: ${err.message}`)
  }

  const workflowId = body.result.workflowId as string
  const maxAttempts = 30
  const pollIntervalMs = 2000

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs))
    const statusRes = await fetch(`${BASE_URL}/workflows/${workflowId}`, {
      headers: getAuthHeaders(),
    })
    const statusBody = (await statusRes.json()) as WorkflowStatusResponse
    if (!statusBody.success) {
      throw new Error(
        `LinkedIn API: ${statusBody.error?.message ?? 'Failed to get workflow status'}`
      )
    }

    const status = statusBody.result?.workflowStatus
    if (status === 'completed') {
      const completion = statusBody.result?.completion
      if (completion && 'success' in completion && !completion.success) {
        const err = completion.error ?? {
          type: 'unknown',
          message: 'Action failed',
        }
        throw new Error(`LinkedIn API: ${err.message}`)
      }
      return {
        data: (statusBody.result?.completion?.data ?? statusBody.result) as T,
      }
    }
    if (status === 'failed') {
      const failure = statusBody.result?.failure
      const err = failure
        ? { type: failure.reason, message: failure.message }
        : statusBody.error ?? { type: 'unknown', message: 'Workflow failed' }
      throw new Error(`LinkedIn API: ${err.message}`)
    }
  }

  throw new Error('LinkedIn API: Workflow timed out')
}

/**
 * Fetch a LinkedIn profile by URL. Returns basic info and recent activity.
 */
export async function getProfile(profileUrl: string): Promise<LinkedInProfile> {
  const normalizedUrl = profileUrl.trim()
  if (!normalizedUrl) {
    throw new Error('Profile URL is required')
  }

  const result = await executeWorkflow<{
    name?: string
    publicUrl?: string
    headline?: string
    location?: string
    about?: string
    position?: string
    companyName?: string
    then?: { data?: Array<{ text?: string; time?: string }> }
  }>({
    actionType: 'st.openPersonPage',
    personUrl: normalizedUrl,
    basicInfo: true,
    then: {
      actionType: 'st.retrievePersonPosts',
      limit: 5,
    },
  })

  const data = result.data as Record<string, unknown>
  const thenData = data?.then as Record<string, unknown> | undefined
  const posts = (thenData?.data as Array<{ text?: string; time?: string }>) ?? []
  const recentActivity = posts
    .slice(0, 3)
    .map((p) => (p.text ? `${p.text.slice(0, 200)}${(p.text?.length ?? 0) > 200 ? '...' : ''}` : ''))
    .filter(Boolean)
    .join('\n---\n')

  return {
    url: (data.publicUrl as string) ?? normalizedUrl,
    name: (data.name as string) ?? 'Unknown',
    headline: (data.headline as string) ?? undefined,
    recentActivity: recentActivity || undefined,
  }
}

/**
 * Send a DM to a LinkedIn profile. ALWAYS require approval before calling.
 */
export async function sendDM(params: LinkedInDMParams): Promise<void> {
  const { profileUrl, message } = params
  const normalizedUrl = profileUrl.trim()
  const trimmedMessage = message.trim()

  if (!normalizedUrl) throw new Error('Profile URL is required')
  if (!trimmedMessage) throw new Error('Message is required')
  if (trimmedMessage.length > 1900) {
    throw new Error('Message must be 1900 characters or less')
  }

  await executeWorkflow({
    actionType: 'st.sendMessage',
    personUrl: normalizedUrl,
    text: trimmedMessage,
  })
}

/**
 * Get connection degree: 1st (connected), 2nd/3rd (not connected), or pending.
 */
export async function getConnectionDegree(
  profileUrl: string
): Promise<'1st' | '2nd' | '3rd' | 'pending'> {
  const normalizedUrl = profileUrl.trim()
  if (!normalizedUrl) throw new Error('Profile URL is required')

  const result = await executeWorkflow<{ connectionStatus?: string }>({
    actionType: 'st.checkConnectionStatus',
    personUrl: normalizedUrl,
  })

  const status = result.data?.connectionStatus
  switch (status) {
    case 'connected':
      return '1st'
    case 'pending':
      return 'pending'
    case 'notConnected':
      return '2nd' // LinkedIn doesn't distinguish 2nd vs 3rd via this API
    default:
      return '3rd'
  }
}

export interface PeopleSearchFilters {
  firstName?: string
  lastName?: string
  position?: string
  locations?: string[]
  industries?: string[]
  currentCompanies?: string[]
  previousCompanies?: string[]
  schools?: string[]
}

export interface PeopleSearchResult {
  name: string
  publicUrl: string
  headline?: string
  location?: string
}

/**
 * Search LinkedIn people with optional filters.
 */
export async function searchPeople(
  query: string,
  filters?: PeopleSearchFilters,
  limit = 10
): Promise<PeopleSearchResult[]> {
  const term = query.trim()
  if (!term) throw new Error('Search query is required')

  const action: Record<string, unknown> = {
    actionType: 'st.searchPeople',
    term,
    limit: Math.min(Math.max(limit, 1), 25),
  }
  if (filters && Object.keys(filters).length > 0) {
    action.filter = filters
  }

  const result = await executeWorkflow<PeopleSearchResult[]>(action)
  const data = result.data
  return Array.isArray(data) ? data : []
}
