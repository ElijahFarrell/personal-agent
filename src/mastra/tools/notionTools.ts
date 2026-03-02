import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import * as notionService from '@/services/notionService'

export function createNotionSearchTool(userId: string) {
  return createTool({
    id: 'notion-search',
    description: 'Search for pages in the connected Notion workspace by keyword.',
    inputSchema: z.object({
      query: z.string().describe('Search query to find pages'),
    }),
    execute: async ({ query }) => {
      try {
        const pages = await notionService.searchPages(userId, query)
        return { pages, count: pages.length }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Search failed' }
      }
    },
  })
}

export function createNotionReadPageTool(userId: string) {
  return createTool({
    id: 'notion-read-page',
    description: 'Read the content of a specific Notion page by its page ID.',
    inputSchema: z.object({
      pageId: z.string().describe('Notion page ID'),
    }),
    execute: async ({ pageId }) => {
      try {
        const content = await notionService.getPageContent(userId, pageId)
        return { content }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to read page' }
      }
    },
  })
}

export function createNotionCreatePageTool(userId: string) {
  return createTool({
    id: 'notion-create-page',
    description:
      'Create a new page under an existing Notion page. Requires the parent page ID, title, and initial content.',
    inputSchema: z.object({
      parentPageId: z.string().describe('Parent Notion page ID to nest the new page under'),
      title: z.string().describe('Title for the new page'),
      content: z.string().describe('Initial text content for the page'),
    }),
    execute: async ({ parentPageId, title, content }) => {
      try {
        const page = await notionService.createPage(userId, parentPageId, title, content)
        return { success: true, page }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to create page' }
      }
    },
  })
}
