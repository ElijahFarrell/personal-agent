import { createHash } from 'crypto'
import { embed, gateway } from 'ai'
import { QdrantClient } from '@qdrant/js-client-rest'
import { config } from '@/lib/config'
import type { ResourceScope } from '@/types'
import {
  QDRANT_COLLECTIONS,
  VECTOR_CONFIG,
} from '@/constants/vector'

const COLLECTION = QDRANT_COLLECTIONS.CONTEXT_DOCS
const VECTOR_SIZE = VECTOR_CONFIG.DIMENSION
const RELEVANCE_THRESHOLD = VECTOR_CONFIG.CONTEXT_THRESHOLD
const TOP_K = VECTOR_CONFIG.CONTEXT_TOP_K

const qdrant = new QdrantClient({
  url: config.qdrant.url,
  apiKey: config.qdrant.apiKey || undefined,
})

function toUUID(str: string): string {
  const h = createHash('md5').update(str).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: gateway.embedding('openai/text-embedding-3-small'),
    value: text,
  })
  return embedding
}

async function ensureCollection(): Promise<void> {
  const collections = await qdrant.getCollections()
  const exists = collections.collections.some((c) => c.name === COLLECTION)

  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
    })
  }
}

/** Index a context doc into Qdrant for vector retrieval. */
export async function indexContextDoc(doc: {
  id: string
  tenantId: string
  scope: ResourceScope
  userId?: string
  title: string
  content: string
  category: string
}): Promise<void> {
  await ensureCollection()

  const text = `${doc.title}\n\n${doc.content}`
  const vector = await embedText(text)

  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: [
      {
        id: toUUID(`${doc.tenantId}-${doc.id}`),
        vector,
        payload: {
          docId: doc.id,
          tenantId: doc.tenantId,
          scope: doc.scope,
          ...(doc.userId ? { userId: doc.userId } : {}),
          title: doc.title,
          content: doc.content,
          category: doc.category,
        },
      },
    ],
  })
}

/** Remove a context doc from Qdrant. */
export async function removeContextDoc(tenantId: string, docId: string): Promise<void> {
  try {
    await qdrant.delete(COLLECTION, {
      wait: true,
      points: [toUUID(`${tenantId}-${docId}`)],
    })
  } catch {
    // Point may not exist yet — safe to ignore
  }
}

export interface ContextSearchResult {
  docId: string
  title: string
  content: string
  category: string
  score: number
}

/**
 * Retrieve context docs relevant to a query.
 * Returns both org-scoped docs for the tenant and user-scoped docs for the user.
 */
export async function retrieveRelevantContext(
  query: string,
  tenantId: string,
  userId?: string
): Promise<ContextSearchResult[]> {
  try {
    await ensureCollection()
  } catch {
    return []
  }

  const queryEmbedding = await embedText(query)

  const results = await qdrant.search(COLLECTION, {
    vector: queryEmbedding,
    limit: TOP_K * 5,
    score_threshold: RELEVANCE_THRESHOLD,
    with_payload: true,
  })

  const visible = results.filter((r) => {
    if (r.payload?.tenantId !== tenantId) return false
    const scope = r.payload?.scope as string | undefined
    if (scope === 'user') return r.payload?.userId === userId
    return true // org-scoped or legacy (no scope field)
  })

  return visible.slice(0, TOP_K).map((r) => ({
    docId: r.payload?.docId as string,
    title: r.payload?.title as string,
    content: r.payload?.content as string,
    category: r.payload?.category as string,
    score: r.score,
  }))
}

/** Format retrieved context docs as a prompt block. */
export function buildContextBlock(results: ContextSearchResult[]): string {
  if (results.length === 0) return ''

  const blocks = results
    .map(
      (r) =>
        `<context title="${r.title}" category="${r.category}">\n${r.content}\n</context>`
    )
    .join('\n\n')

  return `## Business Context\nThe following is the user's business context — use it to personalize your responses.\n\n${blocks}`
}
