import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import * as linkedinService from '@/services/linkedinService'

/**
 * Research a LinkedIn profile. Returns profile details and recent activity.
 */
export function createLinkedInProfileTool(_userId: string) {
  return createTool({
    id: 'linkedin-profile',
    description:
      'Fetch a LinkedIn profile by URL. Returns name, headline, and recent posts/activity. ' +
      'Use before drafting outreach to personalize your message.',
    inputSchema: z.object({
      profileUrl: z.string().url().describe('LinkedIn profile URL (e.g. https://linkedin.com/in/username)'),
    }),
    execute: async ({ profileUrl }) => {
      try {
        const profile = await linkedinService.getProfile(profileUrl)
        const degree = await linkedinService.getConnectionDegree(profileUrl)
        return {
          ...profile,
          connectionDegree: degree,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch profile'
        throw new Error(message)
      }
    },
  })
}

/**
 * Send a LinkedIn DM. Only call after showing draft and receiving explicit confirmation.
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
        await linkedinService.sendDM({
          profileUrl,
          message,
        })
        return { success: true, message: 'DM sent successfully.' }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send DM'
        throw new Error(message)
      }
    },
  })
}

/**
 * Search LinkedIn profiles by query.
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
        const results = await linkedinService.searchPeople(
          query,
          undefined,
          maxResults
        )
        return {
          results: results.map((r) => ({
            name: r.name,
            url: r.publicUrl,
            headline: r.headline,
            location: r.location,
          })),
          count: results.length,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Search failed'
        throw new Error(message)
      }
    },
  })
}
