import { qdrantVector, embedText } from '@/mastra/workspace'
import type { ResourceScope } from '@/types'

const COLLECTION = 'context_docs'
const DIMENSION = 1536
const RELEVANCE_THRESHOLD = 0.4
const TOP_K = 5

async function ensureCollection(): Promise<void> {
  const indexes = await qdrantVector.listIndexes()
  if (!indexes.includes(COLLECTION)) {
    await qdrantVector.createIndex({
      indexName: COLLECTION,
      dimension: DIMENSION,
      metric: 'cosine',
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

  await qdrantVector.upsert({
    indexName: COLLECTION,
    vectors: [vector],
    metadata: [
      {
        docId: doc.id,
        tenantId: doc.tenantId,
        scope: doc.scope,
        ...(doc.userId ? { userId: doc.userId } : {}),
        title: doc.title,
        content: doc.content,
        category: doc.category,
      },
    ],
    ids: [`${doc.tenantId}-${doc.id}`],
  })
}

/** Remove a context doc from Qdrant. */
export async function removeContextDoc(tenantId: string, docId: string): Promise<void> {
  try {
    await qdrantVector.deleteVector({
      indexName: COLLECTION,
      id: `${tenantId}-${docId}`,
    })
  } catch {
    // Point may not exist — safe to ignore
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

  const queryVector = await embedText(query)

  const results = await qdrantVector.query({
    indexName: COLLECTION,
    queryVector,
    topK: TOP_K * 5,
    includeVector: false,
  })

  const visible = results.filter((r) => {
    if (r.metadata?.tenantId !== tenantId) return false
    const scope = r.metadata?.scope as string | undefined
    if (scope === 'user') return r.metadata?.userId === userId
    return true
  })

  return visible
    .filter((r) => r.score >= RELEVANCE_THRESHOLD)
    .slice(0, TOP_K)
    .map((r) => ({
      docId: r.metadata?.docId as string,
      title: r.metadata?.title as string,
      content: r.metadata?.content as string,
      category: r.metadata?.category as string,
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
