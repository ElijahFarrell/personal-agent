/**
 * Vector / Qdrant configuration constants.
 */
export const QDRANT_COLLECTIONS = {
  SKILLS: 'skills',
  CONTEXT_DOCS: 'context_docs',
} as const

export const VECTOR_CONFIG = {
  /** OpenAI text-embedding-3-small dimension */
  DIMENSION: 1536,
  /** Relevance threshold for skill retrieval */
  SKILL_THRESHOLD: 0.45,
  /** Relevance threshold for context retrieval */
  CONTEXT_THRESHOLD: 0.4,
  /** Max results for skill search */
  SKILL_TOP_K: 5,
  /** Max results for context search */
  CONTEXT_TOP_K: 5,
  /** Distance metric */
  DISTANCE: 'Cosine' as const,
} as const
