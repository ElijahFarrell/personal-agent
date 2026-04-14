import { createHash } from 'node:crypto'
import { QdrantClient } from '@qdrant/js-client-rest'
import { config } from '@/lib/config'

type QdrantDistance = 'Cosine' | 'Dot' | 'Euclid' | 'Manhattan'

const qdrantClient = new QdrantClient({
  url: config.qdrant.url,
  ...(config.qdrant.apiKey ? { apiKey: config.qdrant.apiKey } : {}),
})

function extractVectorSize(vectors: unknown): number | null {
  if (!vectors || typeof vectors !== 'object' || Array.isArray(vectors)) {
    return null
  }

  if ('size' in vectors && typeof vectors.size === 'number') {
    return vectors.size
  }

  for (const value of Object.values(vectors)) {
    if (value && typeof value === 'object' && 'size' in value && typeof value.size === 'number') {
      return value.size
    }
  }

  return null
}

async function createCollection(
  indexName: string,
  dimension: number,
  distance: QdrantDistance
): Promise<void> {
  await qdrantClient.createCollection(indexName, {
    vectors: {
      size: dimension,
      distance,
    },
  })
}

export async function ensureQdrantCollection(
  indexName: string,
  dimension: number,
  distance: QdrantDistance = 'Cosine'
): Promise<void> {
  const exists = await qdrantClient.collectionExists(indexName)
  if (!exists) {
    // #region agent log
    console.log('[DBG:a3b5eb] collection not found, creating', JSON.stringify({indexName,dimension}))
    fetch('http://127.0.0.1:7354/ingest/1a725a3c-99e0-4022-8d2b-3888a9f3a42c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a3b5eb'},body:JSON.stringify({sessionId:'a3b5eb',location:'qdrantCollections.ts:49',message:'collection does not exist, creating',data:{indexName,dimension},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    await createCollection(indexName, dimension, distance)
    return
  }

  const info = await qdrantClient.getCollection(indexName)
  const vectorsConfig = (info as { config?: { params?: { vectors?: unknown } } }).config?.params?.vectors
  const currentSize = extractVectorSize(vectorsConfig)

  // #region agent log
  console.log('[DBG:a3b5eb] ensureCollection check', JSON.stringify({indexName,dimension,currentSize,vectorsConfigRaw:JSON.stringify(vectorsConfig).slice(0,500)}))
  fetch('http://127.0.0.1:7354/ingest/1a725a3c-99e0-4022-8d2b-3888a9f3a42c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a3b5eb'},body:JSON.stringify({sessionId:'a3b5eb',location:'qdrantCollections.ts:60',message:'ensureQdrantCollection check',data:{indexName,dimension,currentSize,vectorsConfigKeys:vectorsConfig ? Object.keys(vectorsConfig as object) : null,vectorsConfigRaw:JSON.stringify(vectorsConfig).slice(0,500)},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  if (currentSize !== null && currentSize !== dimension) {
    await qdrantClient.deleteCollection(indexName)
    await createCollection(indexName, dimension, distance)
  }
}

export async function recreateQdrantCollection(
  indexName: string,
  dimension: number,
  distance: QdrantDistance = 'Cosine'
): Promise<void> {
  const exists = await qdrantClient.collectionExists(indexName)
  if (exists) {
    await qdrantClient.deleteCollection(indexName)
  }
  await createCollection(indexName, dimension, distance)
}

/**
 * Derive a deterministic UUID from an arbitrary string key.
 * Qdrant only accepts unsigned integers or UUIDs as point IDs.
 */
export function qdrantPointId(key: string): string {
  const hex = createHash('sha256').update(key).digest('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

export function isQdrantDimensionMismatchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    message.includes('expected dim') ||
    message.includes('vector dimension error') ||
    message.includes('vector inserting error')
  )
}
