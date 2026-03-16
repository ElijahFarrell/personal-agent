import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { CONTENT_PLATFORM, SCOPE } from '@convex/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

const platformSchema = z.enum([
  CONTENT_PLATFORM.LINKEDIN,
  CONTENT_PLATFORM.X,
  CONTENT_PLATFORM.YOUTUBE,
  CONTENT_PLATFORM.INSTAGRAM,
  CONTENT_PLATFORM.TIKTOK,
])

export interface ContentDraftScope {
  tenantId: string
  userId: string
}

export function createContentDraftTool(scope: ContentDraftScope) {
  return createTool({
    id: 'create-content-draft',
    description:
      'Save a content draft for later. Use when the user wants to save a post, tweet, or other content ' +
      'to review or post later. Specify platform (linkedin, x, youtube, instagram, tiktok) and the content body. ' +
      'Drafts appear in the Content tab where the user can copy, edit, or post them.',
    inputSchema: z.object({
      platform: platformSchema.describe('Platform: linkedin, x, youtube, instagram, or tiktok'),
      content: z.string().describe('The full content body of the draft'),
      title: z.string().optional().describe('Optional title (e.g. for YouTube)'),
      scope: z
        .enum([SCOPE.ORG, SCOPE.USER])
        .optional()
        .describe('org for team-wide, user for personal. Default: user'),
    }),
    execute: async (input) => {
      try {
        const draftScope = input.scope ?? SCOPE.USER
        const draftId = await convex.mutation(api.contentDrafts.createContentDraft, {
          tenantId: scope.tenantId as Id<'tenants'>,
          userId: scope.userId as Id<'users'>,
          scope: draftScope,
          platform: input.platform,
          content: input.content,
          title: input.title,
        })
        return {
          success: true,
          draftId,
          message: `Draft saved for ${input.platform}. The user can find it in the Content tab.`,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, message }
      }
    },
  })
}

export function createListContentDraftsTool(scope: ContentDraftScope) {
  return createTool({
    id: 'list-content-drafts',
    description:
      'List content drafts for a platform. Use when the user wants to see their saved drafts, ' +
      'work with existing content, or check what they have ready to post.',
    inputSchema: z.object({
      platform: platformSchema
        .optional()
        .describe('Filter by platform. Omit to list all platforms'),
      scope: z
        .enum([SCOPE.ORG, SCOPE.USER])
        .optional()
        .describe('org or user. Default: user'),
      limit: z.number().optional().describe('Max drafts to return. Default: 10'),
    }),
    execute: async (input) => {
      try {
        const draftScope = input.scope ?? SCOPE.USER
        const limit = input.limit ?? 10

        const drafts =
          draftScope === SCOPE.ORG
            ? await convex.query(api.contentDrafts.getOrgContentDrafts, {
                tenantId: scope.tenantId as Id<'tenants'>,
                platform: input.platform,
              })
            : await convex.query(api.contentDrafts.getUserContentDrafts, {
                userId: scope.userId as Id<'users'>,
                platform: input.platform,
              })

        const limited = drafts.slice(0, limit)
        if (limited.length === 0) {
          return {
            drafts: [],
            message: `No ${input.platform ?? ''} drafts found.`,
          }
        }

        return {
          drafts: limited.map((d) => ({
            id: d._id,
            platform: d.platform,
            title: d.title,
            contentPreview: d.content.slice(0, 150) + (d.content.length > 150 ? '...' : ''),
            status: d.status,
            createdAt: d.createdAt,
          })),
          message: `Found ${limited.length} draft(s).`,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, drafts: [], message }
      }
    },
  })
}
