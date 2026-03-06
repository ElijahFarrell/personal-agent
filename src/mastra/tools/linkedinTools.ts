import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import * as apifyService from '@/services/apifyService'
import * as linkedinService from '@/services/linkedinService'
import { search } from '@/services/searchService'

/**
 * Research a LinkedIn profile via Apify, with web search fallback.
 * Returns profile details and recent posts.
 */
export function createLinkedInProfileTool(_userId: string) {
  return createTool({
    id: 'linkedin-profile',
    description:
      'Fetch a LinkedIn profile by URL. Returns name, headline, about, experience, and recent posts. ' +
      'Use before drafting outreach to personalize your message.',
    inputSchema: z.object({
      profileUrl: z.string().url().describe('LinkedIn profile URL (e.g. https://linkedin.com/in/username)'),
    }),
    execute: async ({ profileUrl }) => {
      try {
        const [profile, posts] = await Promise.all([
          apifyService.getLinkedInProfile(profileUrl),
          apifyService.getLinkedInPosts(profileUrl, 3),
        ])
        return {
          name: profile?.name,
          headline: profile?.headline,
          about: profile?.about,
          location: profile?.location,
          profileUrl: profile?.profileUrl ?? profileUrl,
          experience: profile?.experience,
          education: profile?.education,
          skills: profile?.skills,
          recentPosts: posts.map((p) => ({ text: p.text.slice(0, 200), date: p.date, reactions: p.reactions })),
        }
      } catch (err) {
        console.warn('[LinkedInTool] Apify failed, falling back to web search:', (err as Error).message)
        try {
          const results = await search(`${profileUrl} site:linkedin.com`, 'fast')
          if (results.length > 0) {
            return {
              name: undefined,
              headline: results[0].content.slice(0, 200),
              about: results.slice(1, 3).map((r) => r.content.slice(0, 150)).join('\n'),
              profileUrl,
              recentPosts: [],
            }
          }
        } catch { /* fallback also failed */ }
        throw new Error('Could not retrieve LinkedIn profile. Please check the URL and try again.')
      }
    },
  })
}

/**
 * Send a LinkedIn DM. Only call after showing draft and receiving explicit confirmation.
 * Falls back gracefully if linkedapi.io is not configured.
 */
export function createLinkedInDMTool(_userId: string) {
  return createTool({
    id: 'linkedin-dm',
    description:
      'Only call this tool after showing the message draft to the user and receiving explicit confirmation to send. ' +
      'Sends a direct message on LinkedIn. Never auto-send — always require user approval first.',
    inputSchema: z.object({
      profileUrl: z.string().url().describe('LinkedIn profile URL'),
      message: z.string().describe('The message to send (max 300 chars for first messages)'),
      confirmed: z
        .boolean()
        .describe('Must be true to send. If false, returns draft for user review.'),
    }),
    execute: async ({ profileUrl, message, confirmed }) => {
      if (!confirmed) {
        return {
          draft: true,
          profileUrl,
          message,
          instruction:
            'Draft ready for review. Please confirm if you want to send this message.',
        }
      }

      try {
        await linkedinService.sendDM({ profileUrl, message })
        return { success: true, message: 'DM sent successfully.' }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to send DM'
        if (msg.includes('LINKEDAPI_KEY') || msg.includes('not configured')) {
          return {
            success: false,
            message: 'LinkedIn DM sending is not configured. Copy the message from the prospects table and paste it manually.',
            draft: message,
          }
        }
        throw new Error(msg)
      }
    },
  })
}

/**
 * Search for LinkedIn profiles using web search (Apify doesn't have a direct people search).
 * Parses LinkedIn profile URLs from search results.
 */
export function createLinkedInSearchTool(_userId: string) {
  return createTool({
    id: 'linkedin-search',
    description:
      'Search LinkedIn for people by name, role, company, or keywords. ' +
      'Returns matching profiles with URLs for further research.',
    inputSchema: z.object({
      query: z.string().describe('Search query (name, role, company, keywords)'),
      maxResults: z.number().min(1).max(25).optional().default(10),
    }),
    execute: async ({ query, maxResults }) => {
      try {
        const results = await search(`${query} site:linkedin.com/in/`, 'fast')
        const profiles = results
          .filter((r) => r.url.includes('linkedin.com/in/'))
          .slice(0, maxResults)
          .map((r) => ({
            name: r.title.replace(/\s*[-|].*$/, ''),
            url: r.url,
            headline: r.content.slice(0, 200),
          }))

        return { results: profiles, count: profiles.length }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Search failed'
        throw new Error(msg)
      }
    },
  })
}
