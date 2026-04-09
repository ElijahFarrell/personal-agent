/**
 * LinkedIn data scraping via Apify actors.
 *
 * Profile: freshdata/fresh-linkedin-profile-data (715 users, 5/5 stars, no cookies)
 *   - Input: { linkedin_url: string }
 *   - Output: nested under `data` key with experiences, educations, skills, about, etc.
 *
 * Posts: datadoping/linkedin-profile-posts-scraper (205 users, 5/5 stars, no cookies)
 *   - Input: { profiles: string[], max_posts: number }
 *   - Output: flat items with text, postUrl, totalReactions, totalComments, etc.
 */
import { ApifyClient } from 'apify-client'
import { config } from '@/lib/config'
import type { ApifyLinkedInProfile, ApifyLinkedInPost } from '@/types'

const PROFILE_ACTOR_ID = 'freshdata/fresh-linkedin-profile-data'
const POSTS_ACTOR_ID = 'datadoping/linkedin-profile-posts-scraper'

function getClient(): ApifyClient {
  const token = config.apify.apiToken
  if (!token?.trim()) {
    throw new Error(
      'Apify API is not configured. Set APIFY_API_TOKEN in your environment. ' +
        'Get a token from https://console.apify.com/account/integrations'
    )
  }
  return new ApifyClient({ token })
}

function extractUsername(profileUrl: string): string {
  const match = profileUrl.match(/linkedin\.com\/in\/([^/?#]+)/)
  return match ? match[1] : profileUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/**
 * Scrape a LinkedIn profile by URL. Returns structured profile data.
 * Uses freshdata/fresh-linkedin-profile-data (takes a single linkedin_url).
 */
export async function getLinkedInProfile(
  profileUrl: string
): Promise<ApifyLinkedInProfile | null> {
  const url = profileUrl.trim()
  if (!url) throw new Error('Profile URL is required')

  const client = getClient()

  const run = await client.actor(PROFILE_ACTOR_ID).call({
    linkedin_url: url,
  })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  if (!items.length) return null

  const raw = items[0] as Record<string, unknown>
  const data = (raw.data as Record<string, unknown>) ?? raw

  return {
    name: asStr(data.full_name) ?? asStr(data.name),
    headline: asStr(data.headline) ?? asStr(data.title),
    about: asStr(data.about) ?? asStr(data.summary),
    location: asStr(data.city)
      ? [asStr(data.city), asStr(data.country)].filter(Boolean).join(', ')
      : asStr(data.location),
    profileUrl: asStr(data.linkedin_url) ?? asStr(data.profileUrl) ?? url,
    experience: Array.isArray(data.experiences)
      ? (data.experiences as Array<Record<string, unknown>>).slice(0, 5).map((e) => ({
          title: asStr(e.title) ?? '',
          company: asStr(e.company) ?? '',
          duration: asStr(e.duration) ?? asStr(e.date_range) ?? '',
        }))
      : undefined,
    education: Array.isArray(data.educations)
      ? (data.educations as Array<Record<string, unknown>>).slice(0, 3).map((e) => ({
          school: asStr(e.school) ?? '',
          degree: [asStr(e.degree), asStr(e.field_of_study)].filter(Boolean).join(' — '),
        }))
      : undefined,
    skills: Array.isArray(data.skills)
      ? (data.skills as Array<string | Record<string, unknown>>)
          .slice(0, 10)
          .map((s) => (typeof s === 'string' ? s : asStr((s as Record<string, unknown>).name) ?? ''))
          .filter(Boolean)
      : undefined,
  }
}

/**
 * Scrape recent LinkedIn posts for a profile. Returns up to `limit` posts.
 * Uses datadoping/linkedin-profile-posts-scraper (takes profiles array + max_posts).
 */
export async function getLinkedInPosts(
  profileUrl: string,
  limit = 10
): Promise<ApifyLinkedInPost[]> {
  const url = profileUrl.trim()
  if (!url) throw new Error('Profile URL is required')

  const client = getClient()
  const username = extractUsername(url)

  const run = await client.actor(POSTS_ACTOR_ID).call({
    profiles: [username],
    max_posts: Math.max(limit, 10),
  })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()

  return items.slice(0, limit).map((raw) => {
    const item = raw as Record<string, unknown>
    return {
      text: asStr(item.text) ?? asStr(item.postText) ?? asStr(item.content) ?? '',
      date: asStr(item.postedAt) ?? asStr(item.date) ?? asStr(item.timestamp),
      reactions:
        asNum(item.totalReactions) ??
        asNum(item.likesCount) ??
        asNum(item.total_reactions) ??
        0,
      comments:
        asNum(item.totalComments) ??
        asNum(item.commentsCount) ??
        asNum(item.total_comments) ??
        0,
      url: asStr(item.postUrl) ?? asStr(item.url) ?? asStr(item.post_url),
    }
  })
}

/**
 * YouTube transcript via Apify. Override with `APIFY_YOUTUBE_TRANSCRIPT_ACTOR_ID`.
 * Default: streamers/youtube-transcript-scraper (startUrls input).
 */
const YOUTUBE_TRANSCRIPT_ACTOR_ID =
  typeof process !== 'undefined'
    ? (process.env.APIFY_YOUTUBE_TRANSCRIPT_ACTOR_ID?.trim() ||
        'streamers/youtube-transcript-scraper')
    : 'streamers/youtube-transcript-scraper'

/**
 * Fetch transcript text for a YouTube watch or youtu.be URL using a configured Apify Actor.
 */
export async function getYoutubeTranscriptFromUrl(videoUrl: string): Promise<{
  title: string
  transcript: string
}> {
  const url = videoUrl.trim()
  if (!url) throw new Error('Video URL is required')

  const client = getClient()
  const run = await client.actor(YOUTUBE_TRANSCRIPT_ACTOR_ID).call({
    startUrls: [{ url }],
  })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  if (!items.length) {
    throw new Error('No transcript data returned from Apify')
  }

  const raw = items[0] as Record<string, unknown>
  const title =
    asStr(raw.title) ??
    asStr(raw.videoTitle) ??
    asStr(raw.name) ??
    'YouTube video'

  const transcript =
    asStr(raw.transcript) ??
    asStr(raw.text) ??
    asStr(raw.fullTranscript) ??
    (Array.isArray(raw.transcripts)
      ? (raw.transcripts as Array<Record<string, unknown>>)
          .map((t) => asStr(t.text) ?? asStr(t.transcript) ?? '')
          .filter(Boolean)
          .join('\n')
      : '') ??
    ''

  if (!transcript.trim()) {
    throw new Error('Transcript text was empty — check APIFY_YOUTUBE_TRANSCRIPT_ACTOR_ID input format')
  }

  return { title, transcript: transcript.trim() }
}

function asStr(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim() ? val.trim() : undefined
}

function asNum(val: unknown): number | undefined {
  return typeof val === 'number' ? val : undefined
}
