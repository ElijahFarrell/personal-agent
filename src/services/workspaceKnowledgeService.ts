import { MDocument } from '@mastra/rag'
import { qdrantVector, embedText } from '@/mastra/workspace'
import type { ResourceScope } from '@/types'
import {
  ensureQdrantCollection,
  isQdrantDimensionMismatchError,
  qdrantPointId,
  recreateQdrantCollection,
} from '@/lib/qdrantCollections'

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
  reference: string
  pageNumber?: number
  sourceUrl?: string
  score: number
  source: 'workspace' | 'context'
}

async function ensureCollection(): Promise<void> {
  await ensureQdrantCollection(COLLECTION, DIMENSION)
}

async function ensureLegacyCollection(): Promise<void> {
  await ensureQdrantCollection(LEGACY_COLLECTION, DIMENSION)
}

export interface WorkspaceChunkSeed {
  content: string
  reference?: string
  pageNumber?: number
  sourceUrl?: string
}

interface ChunkedWorkspaceSegment {
  content: string
  reference: string
  pageNumber?: number
  sourceUrl?: string
}

async function chunkSeed(seed: WorkspaceChunkSeed): Promise<ChunkedWorkspaceSegment[]> {
  const trimmed = seed.content.trim()
  if (!trimmed) return []

  const doc = MDocument.fromText(trimmed)
  const chunks = await doc.chunk({
    strategy: 'recursive',
    maxSize: 512,
    overlap: 64,
  })
  const parts = chunks.map((c) => c.getContent()).filter((t) => t.trim())
  const contentParts = parts.length > 0 ? parts : [trimmed.slice(0, 8000)]
  const reference = seed.reference?.trim() || 'Document'

  return contentParts.map((content) => ({
    content,
    reference,
    pageNumber: seed.pageNumber,
    sourceUrl: seed.sourceUrl,
  }))
}

async function chunkSeeds(
  title: string,
  seeds: WorkspaceChunkSeed[]
): Promise<ChunkedWorkspaceSegment[]> {
  const out: ChunkedWorkspaceSegment[] = []

  for (const seed of seeds) {
    const reference =
      seed.reference?.trim() ||
      (seed.pageNumber ? `Page ${seed.pageNumber}` : seed.sourceUrl?.trim() || title)
    const chunked = await chunkSeed({ ...seed, reference })
    out.push(...chunked)
  }

  return out
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, "'")
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
  sourceUrl?: string
  segments?: WorkspaceChunkSeed[]
}): Promise<number> {
  // #region agent log
  console.log('[DBG:a3b5eb] indexWorkspaceDocument START', JSON.stringify({docId:doc.id,segmentCount:doc.segments?.length??0,bodyLen:doc.body?.length??0}))
  // #endregion
  await ensureCollection()
  // #region agent log
  console.log('[DBG:a3b5eb] ensureCollection done')
  // #endregion
  const chunks = await chunkSeeds(
    doc.title,
    doc.segments?.length
      ? doc.segments
      : [
          {
            content: doc.body,
            reference: doc.sourceUrl?.trim() || doc.title,
            sourceUrl: doc.sourceUrl,
          },
        ]
  )
  // #region agent log
  console.log('[DBG:a3b5eb] chunkSeeds done', JSON.stringify({chunkCount:chunks.length}))
  // #endregion
  if (chunks.length === 0) return 0

  const vectors: number[][] = []
  const metadata: Record<string, unknown>[] = []
  const ids: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!
    const vector = await embedText(`${doc.title}\n\n${chunk.content}`)
    vectors.push(vector)
    metadata.push({
      docId: doc.id,
      tenantId: doc.tenantKey,
      scope: doc.scope,
      ...(doc.userId ? { userId: doc.userId } : {}),
      title: doc.title,
      content: chunk.content,
      category: doc.category ?? 'workspace',
      reference: chunk.reference,
      ...(chunk.pageNumber ? { pageNumber: chunk.pageNumber } : {}),
      ...(chunk.sourceUrl || doc.sourceUrl
        ? { sourceUrl: chunk.sourceUrl ?? doc.sourceUrl }
        : {}),
      chunkIndex: i,
    })
    ids.push(qdrantPointId(`${doc.tenantKey}-${doc.id}-ws-${i}`))
    // #region agent log
    if (i === 0 || i === chunks.length - 1) console.log(`[DBG:a3b5eb] embedded chunk ${i}/${chunks.length}, vecDim=${vector.length}`)
    // #endregion
  }

  // #region agent log
  console.log('[DBG:a3b5eb] all embeddings done')
  const _dbgVecLens = vectors.map((v) => v.length)
  const _dbgUniqueLens = [...new Set(_dbgVecLens)]
  console.log('[DBG:a3b5eb] pre-upsert', JSON.stringify({vectorCount:vectors.length,uniqueDimensions:_dbgUniqueLens,expectedDim:DIMENSION,sampleIds:ids.slice(0,3),collection:COLLECTION}))
  fetch('http://127.0.0.1:7354/ingest/1a725a3c-99e0-4022-8d2b-3888a9f3a42c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a3b5eb'},body:JSON.stringify({sessionId:'a3b5eb',location:'workspaceKnowledgeService.ts:pre-upsert',message:'pre-upsert vectors info',data:{vectorCount:vectors.length,uniqueDimensions:_dbgUniqueLens,expectedDim:DIMENSION,sampleIds:ids.slice(0,3),collection:COLLECTION},timestamp:Date.now(),hypothesisId:'H1,H4'})}).catch(()=>{});
  // #endregion

  const upsert = () =>
    qdrantVector.upsert({
      indexName: COLLECTION,
      vectors,
      metadata,
      ids,
    })

  try {
    await upsert()
    // #region agent log
    console.log('[DBG:a3b5eb] upsert succeeded', vectors.length)
    fetch('http://127.0.0.1:7354/ingest/1a725a3c-99e0-4022-8d2b-3888a9f3a42c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a3b5eb'},body:JSON.stringify({sessionId:'a3b5eb',location:'workspaceKnowledgeService.ts:post-upsert',message:'upsert succeeded',data:{vectorCount:vectors.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    const _errMsg = error instanceof Error ? error.message : String(error)
    const _errCause = (error as { cause?: unknown })?.cause
    const _causeMsg = _errCause instanceof Error ? _errCause.message : null
    const _causeData = (_errCause as Record<string, unknown>)?.data ?? null
    const _causeStatus = (_errCause as Record<string, unknown>)?.status ?? null
    const _errData = (error as Record<string, unknown>)?.data ?? null
    const _errStatus = (error as Record<string, unknown>)?.status ?? null
    const _isDimMismatch = isQdrantDimensionMismatchError(error)
    console.log('[DBG:a3b5eb] upsert FAILED', JSON.stringify({errorMessage:_errMsg,causeMessage:_causeMsg,causeData:_causeData,causeStatus:_causeStatus,errorData:_errData,errorStatus:_errStatus,isDimensionMismatch:_isDimMismatch,vectorCount:vectors.length,uniqueDimensions:_dbgUniqueLens}))
    fetch('http://127.0.0.1:7354/ingest/1a725a3c-99e0-4022-8d2b-3888a9f3a42c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a3b5eb'},body:JSON.stringify({sessionId:'a3b5eb',location:'workspaceKnowledgeService.ts:catch',message:'upsert FAILED',data:{errorMessage:_errMsg,causeMessage:_causeMsg,causeData:_causeData,causeStatus:_causeStatus,errorData:_errData,errorStatus:_errStatus,isDimensionMismatch:_isDimMismatch,vectorCount:vectors.length,uniqueDimensions:_dbgUniqueLens},timestamp:Date.now(),hypothesisId:'H2,H5'})}).catch(()=>{});
    // #endregion
    if (!isQdrantDimensionMismatchError(error)) {
      throw error
    }
    await recreateQdrantCollection(COLLECTION, DIMENSION)
    await upsert()
  }

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
        id: qdrantPointId(`${tenantKey}-${docId}-ws-${i}`),
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
      reference: String(r.metadata?.reference ?? r.metadata?.title ?? ''),
      pageNumber:
        typeof r.metadata?.pageNumber === 'number' ? r.metadata.pageNumber : undefined,
      sourceUrl:
        typeof r.metadata?.sourceUrl === 'string' ? r.metadata.sourceUrl : undefined,
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
    const key = `${row.source}:${row.docId}:${row.reference}:${row.content.slice(0, 80)}`
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
    .map((r) => {
      const attrs = [
        `source="${escapeAttribute(r.source)}"`,
        `title="${escapeAttribute(r.title)}"`,
        `category="${escapeAttribute(r.category)}"`,
        `reference="${escapeAttribute(r.reference)}"`,
      ]
      if (r.pageNumber) attrs.push(`page="${r.pageNumber}"`)
      if (r.sourceUrl) attrs.push(`url="${escapeAttribute(r.sourceUrl)}"`)

      const headerLines = [`Reference: ${r.reference}`]
      if (r.sourceUrl) headerLines.push(`URL: ${r.sourceUrl}`)

      return `<knowledge ${attrs.join(' ')}>\n${headerLines.join('\n')}\n\n${r.content}\n</knowledge>`
    })
    .join('\n\n')
  return `## Knowledge base\n${blocks}`
}
