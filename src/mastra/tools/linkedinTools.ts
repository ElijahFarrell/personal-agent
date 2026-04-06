import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import * as apifyService from '@/services/apifyService'
import * as linkedinService from '@/services/linkedinService'

/**
 * Research a LinkedIn profile via Apify, with web search fallback.
 * Returns profile details and recent posts.
 */
export function createLinkedInProfileTool(userId: string) {
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
        const [profile, posts, unipileProfile] = await Promise.all([
          apifyService.getLinkedInProfile(profileUrl),
          apifyService.getLinkedInPosts(profileUrl, 3),
          linkedinService.getProfile(userId, profileUrl).catch(() => null),
        ])
        return {
          name: profile?.name ?? unipileProfile?.name,
          headline: profile?.headline ?? unipileProfile?.headline,
          about: profile?.about,
          location: profile?.location,
          profileUrl: profile?.profileUrl ?? profileUrl,
          experience: profile?.experience,
          education: profile?.education,
          skills: profile?.skills,
          recentPosts: posts.map((p) => ({ text: p.text.slice(0, 200), date: p.date, reactions: p.reactions })),
          messagingProfile: unipileProfile,
        }
      } catch (err) {
        console.warn(
          '[LinkedInTool] Apify failed, falling back to Unipile profile:',
          (err as Error).message
        )
        try {
          const unipileProfile = await linkedinService.getProfile(userId, profileUrl)
          if (unipileProfile) {
            return {
              name: unipileProfile.name,
              headline: unipileProfile.headline,
              about: unipileProfile.recentActivity,
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
export function createLinkedInDMTool(userId: string) {
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
        await linkedinService.sendDM({ clerkUserId: userId, profileUrl, message })
        return { success: true, message: 'DM sent successfully.' }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to send DM'
        if (
          msg.includes('No active linkedin Unipile account') ||
          msg.includes('not configured')
        ) {
          return {
            success: false,
            message:
              'LinkedIn is not connected in Unipile. Connect LinkedIn in Integrations, then try again.',
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
export function createLinkedInSearchTool(userId: string) {
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
        const results = await linkedinService.searchPeople(userId, query, undefined, maxResults)
        const profiles = results.map((r) => ({
          name: r.name,
          url: r.publicUrl,
          headline: r.headline,
        }))

        return { results: profiles, count: profiles.length }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Search failed'
        throw new Error(msg)
      }
    },
  })
}

export function createLinkedInInMailTool(userId: string) {
  return createTool({
    id: 'linkedin-inmail',
    description:
      'Send a LinkedIn InMail (for users outside your direct network). Always require explicit confirmation before sending.',
    inputSchema: z.object({
      profileUrl: z.string().url().describe('LinkedIn profile URL'),
      message: z.string().describe('InMail text'),
      confirmed: z.boolean().describe('Must be true to send'),
    }),
    execute: async ({ profileUrl, message, confirmed }) => {
      if (!confirmed) {
        return {
          draft: true,
          profileUrl,
          message,
          instruction:
            'InMail draft ready. Ask the user for explicit confirmation before sending.',
        }
      }
      await linkedinService.sendInMail({
        clerkUserId: userId,
        profileUrl,
        message,
      })
      return { success: true, message: 'InMail sent successfully.' }
    },
  })
}

export function createLinkedInInviteTool(userId: string) {
  return createTool({
    id: 'linkedin-invite',
    description:
      'Send a LinkedIn connection invitation. Use a short personalized note when available.',
    inputSchema: z.object({
      profileUrl: z.string().url().describe('LinkedIn profile URL'),
      message: z.string().optional().describe('Optional invitation note'),
      confirmed: z.boolean().describe('Must be true to send'),
    }),
    execute: async ({ profileUrl, message, confirmed }) => {
      if (!confirmed) {
        return {
          draft: true,
          profileUrl,
          message,
          instruction:
            'Invitation draft ready. Ask the user for explicit confirmation before sending.',
        }
      }
      await linkedinService.sendInvitation({
        clerkUserId: userId,
        profileUrl,
        message,
      })
      return { success: true, message: 'Invitation sent successfully.' }
    },
  })
}

export function createLinkedInChatHistoryTool(userId: string) {
  return createTool({
    id: 'linkedin-chat-history',
    description:
      'List recent LinkedIn chats and participants from Unipile.',
    inputSchema: z.object({
      query: z.string().optional().describe('Optional attendee filter'),
      maxResults: z.number().min(1).max(50).optional().default(20),
    }),
    execute: async ({ query, maxResults }) => {
      const results = await linkedinService.searchPeople(
        userId,
        query ?? '',
        undefined,
        maxResults
      )
      return {
        results: results.map((r) => ({
          name: r.name,
          profileUrl: r.publicUrl,
          headline: r.headline,
        })),
        count: results.length,
      }
    },
  })
}
