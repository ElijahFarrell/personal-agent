import { qdrantVector, embedText } from '@/mastra/workspace'

const COLLECTION = 'marketing_knowledge'
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

export interface MarketingChunk {
  id: string
  title: string
  content: string
  category: string
  sourceFile: string
}

export async function indexMarketingChunk(chunk: MarketingChunk): Promise<void> {
  await ensureCollection()

  const text = `${chunk.title}\n\n${chunk.content}`
  const vector = await embedText(text)

  await qdrantVector.upsert({
    indexName: COLLECTION,
    vectors: [vector],
    metadata: [
      {
        chunkId: chunk.id,
        title: chunk.title,
        content: chunk.content,
        category: chunk.category,
        sourceFile: chunk.sourceFile,
      },
    ],
    ids: [chunk.id],
  })
}

export async function clearMarketingKnowledge(): Promise<void> {
  const indexes = await qdrantVector.listIndexes()
  if (indexes.includes(COLLECTION)) {
    await qdrantVector.deleteIndex({ indexName: COLLECTION })
  }
  await qdrantVector.createIndex({
    indexName: COLLECTION,
    dimension: DIMENSION,
    metric: 'cosine',
  })
}

export interface MarketingSearchResult {
  chunkId: string
  title: string
  content: string
  category: string
  score: number
}

export async function retrieveMarketingContext(
  query: string
): Promise<MarketingSearchResult[]> {
  try {
    await ensureCollection()
  } catch {
    return []
  }

  const queryVector = await embedText(query)

  const results = await qdrantVector.query({
    indexName: COLLECTION,
    queryVector,
    topK: TOP_K,
    includeVector: false,
  })

  return results
    .filter((r) => r.score >= RELEVANCE_THRESHOLD)
    .slice(0, TOP_K)
    .map((r) => ({
      chunkId: r.metadata?.chunkId as string,
      title: r.metadata?.title as string,
      content: r.metadata?.content as string,
      category: r.metadata?.category as string,
      score: r.score,
    }))
}

export function buildMarketingContextBlock(
  results: MarketingSearchResult[]
): string {
  if (results.length === 0) return ''

  const blocks = results
    .map(
      (r) =>
        `<knowledge title="${r.title}" category="${r.category}">\n${r.content}\n</knowledge>`
    )
    .join('\n\n')

  return `## Retrieved Product Knowledge\nUse the following information to answer the visitor's question accurately.\n\n${blocks}`
}
