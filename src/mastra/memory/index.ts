import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/libsql'
import type { MastraVector } from '@mastra/core/vector'
import { qdrantVector } from '../workspace'
import { OrchestratorWorkingMemorySchema } from './workingMemory'

/**
 * Mastra Memory wiring for the orchestrator and cross-thread sub-agents.
 *
 * Responsibilities:
 *   - Threads, messages, and working memory are stored in a LibSQL-backed
 *     MastraCompositeStore (serverless → :memory:, local → file, Turso →
 *     remote). Keeping storage isolated from the shared Mastra workflow
 *     store avoids cross-contamination and keeps memory writes cheap.
 *   - Semantic recall uses the existing Qdrant vector instance and the
 *     OpenAI `text-embedding-3-small` embedder so we don't introduce a new
 *     embedding provider.
 *
 * Memory scope is always `resource` (user-level) so context persists across
 * threads. Callers pass `resource: userId` on agent.generate() calls.
 */

let _memoryStorage: LibSQLStore | null = null

function getMemoryStorage(): LibSQLStore {
  if (_memoryStorage) return _memoryStorage
  const tursoUrl =
    process.env.MASTRA_MEMORY_URL ??
    process.env.MASTRA_STORAGE_URL ??
    process.env.DATABASE_URL
  const authToken =
    process.env.MASTRA_MEMORY_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN
  const isServerless = process.env.VERCEL === '1'

  const url = tursoUrl ?? (isServerless ? ':memory:' : 'file:./mastra-memory.db')
  _memoryStorage = new LibSQLStore({
    id: 'mastra-memory-libsql',
    url,
    ...(authToken && tursoUrl ? { authToken } : {}),
  })
  return _memoryStorage
}

function canUseSemanticRecall(): boolean {
  return Boolean(process.env.QDRANT_URL) && Boolean(process.env.OPENAI_API_KEY)
}

/** Shared embedder id used across all memory instances. */
const EMBEDDER = 'openai/text-embedding-3-small' as const

/**
 * Orchestrator memory: full working-memory schema, resource-scoped, with
 * semantic recall over past conversations. Gracefully degrades to a
 * messages-only setup when Qdrant/OpenAI are not configured in the
 * environment (e.g. local dev without Qdrant).
 */
export function createOrchestratorMemory(): Memory {
  const useSemantic = canUseSemanticRecall()
  return new Memory({
    storage: getMemoryStorage(),
    ...(useSemantic ? { vector: qdrantVector as MastraVector, embedder: EMBEDDER } : {}),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        scope: 'resource',
        schema: OrchestratorWorkingMemorySchema,
      },
      semanticRecall: useSemantic
        ? {
            topK: 4,
            messageRange: { before: 1, after: 1 },
            scope: 'resource',
            indexName: 'personal_agent_memory',
          }
        : false,
      generateTitle: false,
    },
  })
}

/**
 * Cross-thread sub-agent memory. Lighter than the orchestrator's: no
 * working-memory schema, but still shares semantic recall so sub-agents
 * can recover context from a previous delegation (e.g. "what did the SDR
 * agent research last week?").
 */
export function createSubAgentMemory(agentKey: string): Memory {
  const useSemantic = canUseSemanticRecall()
  return new Memory({
    storage: getMemoryStorage(),
    ...(useSemantic ? { vector: qdrantVector as MastraVector, embedder: EMBEDDER } : {}),
    options: {
      lastMessages: 10,
      workingMemory: { enabled: false },
      semanticRecall: useSemantic
        ? {
            topK: 3,
            messageRange: 1,
            scope: 'resource',
            indexName: `personal_agent_memory_${agentKey}`,
          }
        : false,
      generateTitle: false,
    },
  })
}

export { OrchestratorWorkingMemorySchema } from './workingMemory'
