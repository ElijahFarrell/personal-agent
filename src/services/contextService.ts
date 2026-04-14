import { qdrantVector, embedText } from '@/mastra/workspace'
import type { ResourceScope } from '@/types'
import { ensureQdrantCollection, qdrantPointId } from '@/lib/qdrantCollections'

const LEGACY_COLLECTION = 'context_docs'
const DIMENSION = 1536
const RELEVANCE_THRESHOLD = 0.4
const TOP_K = 5

async function ensureLegacyCollection(): Promise<void> {
  await ensureQdrantCollection(LEGACY_COLLECTION, DIMENSION)
}

/** Index a context doc into Qdrant for vector retrieval (legacy `context_docs` collection). */
export async function indexContextDoc(doc: {
  id: string
  tenantId: string
  scope: ResourceScope
  userId?: string
  title: string
  content: string
  category: string
}): Promise<void> {
  await ensureLegacyCollection()

  const text = `${doc.title}\n\n${doc.content}`
  const vector = await embedText(text)

  await qdrantVector.upsert({
    indexName: LEGACY_COLLECTION,
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
    ids: [qdrantPointId(`${doc.tenantId}-${doc.id}`)],
  })
}

/** Remove a context doc from Qdrant. */
export async function removeContextDoc(tenantId: string, docId: string): Promise<void> {
  try {
    await qdrantVector.deleteVector({
      indexName: LEGACY_COLLECTION,
      id: qdrantPointId(`${tenantId}-${docId}`),
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
  reference?: string
  pageNumber?: number
  sourceUrl?: string
  score: number
}

/**
 * Retrieve context docs relevant to a query.
 * Merges legacy `context_docs` vectors with workspace knowledge (`workspace_knowledge`).
 */
export async function retrieveRelevantContext(
  query: string,
  tenantId: string,
  userId?: string
): Promise<ContextSearchResult[]> {
  const { retrieveWorkspaceKnowledge } = await import('./workspaceKnowledgeService')
  try {
    const merged = await retrieveWorkspaceKnowledge(query, tenantId, userId)
    return merged
      .filter((r) => r.score >= RELEVANCE_THRESHOLD)
      .slice(0, TOP_K)
      .map((r) => ({
        docId: r.docId,
        title: r.title,
        content: r.content,
        category:
          r.source === 'workspace' ? `workspace:${r.category || 'doc'}` : r.category,
        reference: r.reference,
        pageNumber: r.pageNumber,
        sourceUrl: r.sourceUrl,
        score: r.score,
      }))
  } catch {
    return []
  }
}

/** Format retrieved context docs as a prompt block. */
export function buildContextBlock(results: ContextSearchResult[]): string {
  if (results.length === 0) return ''

  const blocks = results
    .map(
      (r) =>
        `<context title="${r.title}" category="${r.category}">\nReference: ${r.reference ?? r.title}${r.sourceUrl ? `\nURL: ${r.sourceUrl}` : ''}${r.pageNumber ? `\nPage: ${r.pageNumber}` : ''}\n\n${r.content}\n</context>`
    )
    .join('\n\n')

  return `## Business Context\nThe following is the user's business context — use it to personalize your responses.\n\n${blocks}`
}
