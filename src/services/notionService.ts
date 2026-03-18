/**
 * Notion operations via Composio.
 * Uses Composio NOTION tools with the user's connected account.
 */
import { executeComposioTool } from '@/lib/composio'

export interface NotionPage {
  id: string
  title: string
  url: string
  lastEdited: string
}

function extractTitle(page: Record<string, unknown>): string {
  const properties = page.properties as Record<string, Record<string, unknown>> | undefined
  if (!properties) return 'Untitled'

  for (const prop of Object.values(properties)) {
    if (prop.type === 'title') {
      const titleArr = prop.title as Array<{ plain_text: string }> | undefined
      return titleArr?.[0]?.plain_text ?? 'Untitled'
    }
  }
  return 'Untitled'
}

/**
 * Searches Notion pages by query.
 */
export async function searchPages(userId: string, query: string): Promise<NotionPage[]> {
  const result = await executeComposioTool<{ results?: Record<string, unknown>[] }>(
    userId,
    'NOTION_SEARCH_NOTION_PAGE',
    {
      query,
      filter: { value: 'page', property: 'object' },
      page_size: 10,
    }
  )

  if (!result.successful || !result.data?.results) {
    if (result.error) throw new Error(result.error)
    return []
  }

  return result.data.results.map((page) => ({
    id: page.id as string,
    title: extractTitle(page),
    url: (page.url as string) ?? '',
    lastEdited: (page.last_edited_time as string) ?? '',
  }))
}

/**
 * Gets page content by fetching block children and extracting text.
 */
export async function getPageContent(userId: string, pageId: string): Promise<string> {
  const result = await executeComposioTool<{ results?: Array<Record<string, unknown>> }>(
    userId,
    'NOTION_FETCH_BLOCK_CONTENTS',
    {
      block_id: pageId,
      page_size: 100,
    }
  )

  if (!result.successful || !result.data) {
    if (result.error) throw new Error(result.error)
    return ''
  }

  const blocks = result.data.results ?? (result.data as { results?: Array<Record<string, unknown>> }).results ?? []
  const lines: string[] = []

  for (const block of blocks) {
    const type = block.type as string
    const content = block[type] as Record<string, unknown> | undefined
    if (!content) continue

    const richText = content.rich_text as Array<{ plain_text: string }> | undefined
    if (richText) {
      const text = richText.map((t) => t.plain_text).join('')
      if (type === 'heading_1') lines.push(`# ${text}`)
      else if (type === 'heading_2') lines.push(`## ${text}`)
      else if (type === 'heading_3') lines.push(`### ${text}`)
      else if (type === 'bulleted_list_item') lines.push(`- ${text}`)
      else if (type === 'numbered_list_item') lines.push(`1. ${text}`)
      else if (type === 'to_do') {
        const checked = (content.checked as boolean) ? '[x]' : '[ ]'
        lines.push(`- ${checked} ${text}`)
      } else {
        lines.push(text)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Creates a new Notion page under a parent.
 */
export async function createPage(
  userId: string,
  parentPageId: string,
  title: string,
  content: string
): Promise<NotionPage> {
  const result = await executeComposioTool<{ id?: string; url?: string; last_edited_time?: string }>(
    userId,
    'NOTION_CREATE_NOTION_PAGE',
    {
      parent_id: parentPageId,
      title,
      markdown: content,
    }
  )

  if (!result.successful && result.error) {
    throw new Error(result.error)
  }

  const data = result.data
  if (!data) throw new Error('No page data returned')

  return {
    id: data.id ?? '',
    title,
    url: data.url ?? '',
    lastEdited: data.last_edited_time ?? '',
  }
}
