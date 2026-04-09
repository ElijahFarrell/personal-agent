import { MDocument } from '@mastra/rag'
import { qdrantVector, embedText } from '@/mastra/workspace'
import type { ResourceScope } from '@/types'

const COLLECTION = 'workspace_knowledge'
const LEGACY_COLLECTION = 'context_docs'
const DIMENSION = 1536
const RELEVANCE_THRESHOLD = 0.4
const TOP_K = 5

export interface WorkspaceSearchResult {
  docId: string
  title: string
  content: string
  category: string
  score: number
  source: 'workspace' | 'context'
}

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

async function ensureLegacyCollection(): Promise<void> {
  const indexes = await qdrantVector.listIndexes()
  if (!indexes.includes(LEGACY_COLLECTION)) {
    await qdrantVector.createIndex({
      indexName: LEGACY_COLLECTION,
      dimension: DIMENSION,
      metric: 'cosine',
    })
  }
}

async function chunkTexts(fullText: string): Promise<string[]> {
  const trimmed = fullText.trim()
  if (!trimmed) return []
  const doc = MDocument.fromText(trimmed)
  const chunks = await doc.chunk({
    strategy: 'recursive',
    maxSize: 512,
    overlap: 64,
  })
  const parts = chunks.map((c) => c.getContent()).filter((t) => t.trim())
  return parts.length > 0 ? parts : [trimmed.slice(0, 8000)]
}

/**
 * Index workspace document chunks into Qdrant.
 * `tenantKey` must match chat RAG filtering — use Clerk org id (`getTenantContext().tenantId`), same as legacy context indexing.
 */
export async function indexWorkspaceDocument(doc: {
  id: string
  tenantKey: string
  scope: ResourceScope
  userId?: string
  title: string
  body: string
  category?: string
}): Promise<number> {
  await ensureCollection()
  const chunks = await chunkTexts(`${doc.title}\n\n${doc.body}`)
  if (chunks.length === 0) return 0

  const vectors: number[][] = []
  const metadata: Record<string, unknown>[] = []
  const ids: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!
    const vector = await embedText(chunk)
    vectors.push(vector)
    metadata.push({
      docId: doc.id,
      tenantId: doc.tenantKey,
      scope: doc.scope,
      ...(doc.userId ? { userId: doc.userId } : {}),
      title: doc.title,
      content: chunk,
      category: doc.category ?? 'workspace',
      chunkIndex: i,
    })
    ids.push(`${doc.tenantKey}-${doc.id}-ws-${i}`)
  }

  await qdrantVector.upsert({
    indexName: COLLECTION,
    vectors,
    metadata,
    ids,
  })

  return chunks.length
}

/** Remove all Qdrant chunks for a workspace document. */
export async function removeWorkspaceDocumentFromIndex(
  tenantKey: string,
  docId: string,
  chunkCount: number
): Promise<void> {
  for (let i = 0; i < chunkCount; i++) {
    try {
      await qdrantVector.deleteVector({
        indexName: COLLECTION,
        id: `${tenantKey}-${docId}-ws-${i}`,
      })
    } catch {
      /* ignore missing */
    }
  }
}

/**
 * Semantic search over workspace knowledge + legacy context_docs index.
 */
export async function retrieveWorkspaceKnowledge(
  query: string,
  tenantId: string,
  userId?: string
): Promise<WorkspaceSearchResult[]> {
  try {
    await ensureCollection()
    await ensureLegacyCollection()
  } catch {
    return []
  }

  const queryVector = await embedText(query)
  const [wsRaw, legacyRaw] = await Promise.all([
    qdrantVector.query({
      indexName: COLLECTION,
      queryVector,
      topK: TOP_K * 4,
      includeVector: false,
    }),
    qdrantVector.query({
      indexName: LEGACY_COLLECTION,
      queryVector,
      topK: TOP_K * 4,
      includeVector: false,
    }),
  ])

  const mapHit = (
    r: { score: number; metadata?: Record<string, unknown> },
    source: WorkspaceSearchResult['source']
  ): WorkspaceSearchResult | null => {
    if (r.metadata?.tenantId !== tenantId) return null
    const scope = r.metadata?.scope as string | undefined
    if (scope === 'user' && r.metadata?.userId !== userId) return null
    if (r.score < RELEVANCE_THRESHOLD) return null
    return {
      docId: String(r.metadata?.docId ?? ''),
      title: String(r.metadata?.title ?? ''),
      content: String(r.metadata?.content ?? ''),
      category: String(r.metadata?.category ?? ''),
      score: r.score,
      source,
    }
  }

  const merged: WorkspaceSearchResult[] = []
  for (const r of wsRaw) {
    const m = mapHit(r, 'workspace')
    if (m) merged.push(m)
  }
  for (const r of legacyRaw) {
    const m = mapHit(r, 'context')
    if (m) merged.push(m)
  }

  merged.sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  const deduped: WorkspaceSearchResult[] = []
  for (const row of merged) {
    const key = `${row.source}:${row.docId}:${row.content.slice(0, 80)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
    if (deduped.length >= TOP_K) break
  }
  return deduped
}

export function buildWorkspaceContextBlock(results: WorkspaceSearchResult[]): string {
  if (results.length === 0) return ''
  const blocks = results
    .map(
      (r) =>
        `<knowledge source="${r.source}" title="${r.title.replace(/"/g, "'")}" category="${r.category}">\n${r.content}\n</knowledge>`
    )
    .join('\n\n')
  return `## Knowledge base\n${blocks}`
}
