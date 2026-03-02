import { getConnection } from './nangoService'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

async function notionFetch(
  endpoint: string,
  userId: string,
  options?: { method?: string; body?: Record<string, unknown> }
) {
  const creds = await getConnection('notion', userId)
  if (!creds) throw new Error('Notion is not connected. Ask the user to connect Notion in Integrations.')

  const res = await fetch(`${NOTION_API}${endpoint}`, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    ...(options?.body && { body: JSON.stringify(options.body) }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(`Notion API error: ${error.message ?? res.statusText}`)
  }

  return res.json()
}

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

export async function searchPages(userId: string, query: string): Promise<NotionPage[]> {
  const data = await notionFetch('/search', userId, {
    method: 'POST',
    body: {
      query,
      filter: { value: 'page', property: 'object' },
      page_size: 10,
    },
  })

  return (data.results ?? []).map((page: Record<string, unknown>) => ({
    id: page.id as string,
    title: extractTitle(page),
    url: (page.url as string) ?? '',
    lastEdited: (page.last_edited_time as string) ?? '',
  }))
}

export async function getPageContent(userId: string, pageId: string): Promise<string> {
  const data = await notionFetch(`/blocks/${pageId}/children?page_size=100`, userId)

  const blocks = (data.results ?? []) as Array<Record<string, unknown>>
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

export async function createPage(
  userId: string,
  parentPageId: string,
  title: string,
  content: string
): Promise<NotionPage> {
  const data = await notionFetch('/pages', userId, {
    method: 'POST',
    body: {
      parent: { page_id: parentPageId },
      properties: {
        title: {
          title: [{ text: { content: title } }],
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content } }],
          },
        },
      ],
    },
  })

  return {
    id: data.id,
    title,
    url: data.url ?? '',
    lastEdited: data.last_edited_time ?? '',
  }
}
