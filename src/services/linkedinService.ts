/**
 * LinkedIn automation via Unipile (account-scoped per Clerk user).
 */
import type { LinkedInProfile, LinkedInDMParams } from '@/types'
import {
  fetchLinkedInProfile,
  searchLinkedIn,
  sendLinkedInDM,
  sendLinkedInInvitationMessage,
} from '@/services/unipileService'

/**
 * Fetch a LinkedIn profile by URL. Returns basic info and recent activity.
 */
export async function getProfile(
  clerkUserId: string,
  profileUrl: string
): Promise<LinkedInProfile> {
  const normalizedUrl = profileUrl.trim()
  if (!normalizedUrl) {
    throw new Error('Profile URL is required')
  }
  const result = (await fetchLinkedInProfile({
    clerkUserId,
    identifier: normalizedUrl,
  })) as Record<string, unknown>
  const name = String(result.name ?? result.full_name ?? 'Unknown')
  const headline = String(result.headline ?? result.title ?? '').trim()
  const publicUrl = String(
    result.public_url ?? result.profile_url ?? result.url ?? normalizedUrl
  )
  const activity = String(
    result.recent_activity ?? result.about ?? result.summary ?? ''
  ).trim()

  return {
    url: publicUrl,
    name,
    headline: headline || undefined,
    recentActivity: activity || undefined,
  }
}

export async function sendInMail(params: LinkedInDMParams): Promise<void> {
  const { clerkUserId, profileUrl, message } = params
  const normalizedUrl = profileUrl.trim()
  const trimmedMessage = message.trim()

  if (!normalizedUrl) throw new Error('Profile URL is required')
  if (!trimmedMessage) throw new Error('Message is required')
  if (trimmedMessage.length > 1900) {
    throw new Error('Message must be 1900 characters or less')
  }
  if (!clerkUserId?.trim()) {
    throw new Error('clerkUserId is required')
  }

  await sendLinkedInDM({
    clerkUserId,
    profileUrl: normalizedUrl,
    message: trimmedMessage,
    inmail: true,
  })
}

/**
 * Send a DM to a LinkedIn profile. ALWAYS require approval before calling.
 */
export async function sendDM(params: LinkedInDMParams): Promise<void> {
  const { clerkUserId, profileUrl, message } = params
  const normalizedUrl = profileUrl.trim()
  const trimmedMessage = message.trim()

  if (!normalizedUrl) throw new Error('Profile URL is required')
  if (!trimmedMessage) throw new Error('Message is required')
  if (trimmedMessage.length > 1900) {
    throw new Error('Message must be 1900 characters or less')
  }

  if (!clerkUserId?.trim()) {
    throw new Error('clerkUserId is required')
  }

  await sendLinkedInDM({
    clerkUserId,
    profileUrl: normalizedUrl,
    message: trimmedMessage,
  })
}

/**
 * Get connection degree: 1st (connected), 2nd/3rd (not connected), or pending.
 */
export async function getConnectionDegree(
  clerkUserId: string,
  profileUrl: string
): Promise<'1st' | '2nd' | '3rd' | 'pending'> {
  const normalizedUrl = profileUrl.trim()
  if (!normalizedUrl) throw new Error('Profile URL is required')
  if (!clerkUserId?.trim()) throw new Error('clerkUserId is required')

  const result = (await fetchLinkedInProfile({
    clerkUserId,
    identifier: normalizedUrl,
  })) as Record<string, unknown>

  const status = String(result.connection_status ?? result.connectionStatus ?? '').toLowerCase()
  switch (status) {
    case 'connected':
    case '1st':
      return '1st'
    case 'pending':
      return 'pending'
    case 'notconnected':
    case '2nd':
      return '2nd'
    case '3rd':
      return '3rd'
    default:
      return '2nd'
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
  clerkUserId: string,
  query: string,
  _filters?: PeopleSearchFilters,
  limit = 10
): Promise<PeopleSearchResult[]> {
  const term = query.trim()
  if (!term) throw new Error('Search query is required')
  if (!clerkUserId?.trim()) throw new Error('clerkUserId is required')

  const rows = await searchLinkedIn({
    clerkUserId,
    query: term,
    limit: Math.min(Math.max(limit, 1), 25),
  })
  return rows.map((row) => ({
    name: row.name ?? 'Unknown',
    publicUrl: row.profileUrl ?? '',
  }))
}

export async function sendInvitation(params: {
  clerkUserId: string
  profileUrl: string
  message?: string
}): Promise<void> {
  const profileUrl = params.profileUrl.trim()
  if (!profileUrl) throw new Error('Profile URL is required')
  if (!params.clerkUserId?.trim()) throw new Error('clerkUserId is required')
  await sendLinkedInInvitationMessage({
    clerkUserId: params.clerkUserId,
    profileUrl,
    message: params.message?.trim() || undefined,
  })
}
