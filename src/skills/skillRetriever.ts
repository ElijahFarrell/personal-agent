import { createHash } from 'crypto'
import { embed, gateway } from 'ai'
import { QdrantClient } from '@qdrant/js-client-rest'
import { config } from '@/lib/config'
import { loadAllSkills } from './skillLoader'
import type { SkillMeta, SkillSearchResult, ResourceScope } from '@/types'
import {
  QDRANT_COLLECTIONS,
  VECTOR_CONFIG,
} from '@/constants/vector'

function toUUID(str: string): string {
  const h = createHash('md5').update(str).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

const COLLECTION = QDRANT_COLLECTIONS.SKILLS
const VECTOR_SIZE = VECTOR_CONFIG.DIMENSION
const RELEVANCE_THRESHOLD = VECTOR_CONFIG.SKILL_THRESHOLD
const TOP_K = VECTOR_CONFIG.SKILL_TOP_K

const qdrant = new QdrantClient({
  url: config.qdrant.url,
  apiKey: config.qdrant.apiKey || undefined,
})

async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: gateway.embedding('openai/text-embedding-3-small'),
    value: text,
  })
  return embedding
}

export async function ensureCollection(): Promise<void> {
  const collections = await qdrant.getCollections()
  const exists = collections.collections.some((c) => c.name === COLLECTION)

  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
    })
  }
}

/** Index all skills from filesystem into Qdrant as org-scoped. Used by the seed route. */
export async function indexSkills(tenantId = 'default'): Promise<void> {
  await ensureCollection()

  const skills = await loadAllSkills()
  const points = await buildSkillPoints(tenantId, 'org', undefined, skills)

  if (points.length > 0) {
    await qdrant.upsert(COLLECTION, { wait: true, points })
  }
}

interface ConvexSkillRecord {
  _id: string
  name: string
  description: string
  systemPrompt: string
  isEnabled: boolean
  scope?: ResourceScope
  userId?: string
}

/**
 * Re-index skills from Convex DB records into Qdrant.
 * Called after CRUD operations so the vector store stays in sync.
 */
export async function reindexSkillsFromDB(
  tenantId: string,
  dbSkills: ConvexSkillRecord[]
): Promise<void> {
  await ensureCollection()

  await clearTenantSkills(tenantId)

  const enabled = dbSkills.filter((s) => s.isEnabled)
  const skillMetas: SkillMeta[] = enabled.map((s) => ({
    id: s._id,
    name: s.name,
    description: s.description,
    triggers: [],
    examples: [],
    constraints: [],
    filePath: '',
    rawContent: s.systemPrompt,
    bundledFiles: {},
  }))

  const allPoints = await Promise.all(
    enabled.map((s, i) =>
      buildSkillPoints(tenantId, s.scope ?? 'org', s.userId, [skillMetas[i]])
    )
  )
  const points = allPoints.flat()

  if (points.length > 0) {
    await qdrant.upsert(COLLECTION, { wait: true, points })
  }

  console.log(`[SkillRetriever] Re-indexed ${enabled.length} enabled skills for tenant ${tenantId}`)
}

/** Remove all Qdrant points for a given tenant. */
async function clearTenantSkills(tenantId: string): Promise<void> {
  try {
    await qdrant.delete(COLLECTION, {
      wait: true,
      filter: { must: [{ key: 'tenantId', match: { value: tenantId } }] },
    })
  } catch {
    // Collection may not exist yet or may have no payload index — safe to ignore
  }
}

async function buildSkillPoints(
  tenantId: string,
  scope: ResourceScope,
  userId: string | undefined,
  skills: SkillMeta[]
): Promise<Array<{ id: string; vector: number[]; payload: Record<string, unknown> }>> {
  const points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> = []

  for (const skill of skills) {
    const descriptionText = `${skill.name}: ${skill.description}`
    const triggersText = skill.triggers.join('\n')
    const examplesText = skill.examples.map((e) => e.query).join('\n')

    const [descEmbedding, trigEmbedding, exEmbedding] = await Promise.all([
      embedText(descriptionText),
      embedText(triggersText || descriptionText),
      embedText(examplesText || descriptionText),
    ])

    const basePayload = {
      skillId: skill.id,
      tenantId,
      scope,
      ...(userId ? { userId } : {}),
      ...skill,
    }

    points.push(
      {
        id: toUUID(`${tenantId}-${scope}-${userId ?? 'org'}-${skill.id}-desc`),
        vector: descEmbedding,
        payload: { ...basePayload, type: 'description' },
      },
      {
        id: toUUID(`${tenantId}-${scope}-${userId ?? 'org'}-${skill.id}-trig`),
        vector: trigEmbedding,
        payload: { ...basePayload, type: 'triggers' },
      },
      {
        id: toUUID(`${tenantId}-${scope}-${userId ?? 'org'}-${skill.id}-ex`),
        vector: exEmbedding,
        payload: { ...basePayload, type: 'examples' },
      }
    )
  }

  return points
}

function reciprocalRankFusion(
  rankedLists: Array<Array<{ skillId: string; score: number; skill: SkillMeta }>>
): Array<{ skill: SkillMeta; score: number }> {
  const k = 60
  const fusionScores = new Map<string, { skill: SkillMeta; score: number }>()

  for (const list of rankedLists) {
    list.forEach(({ skillId, skill }, rank) => {
      const rrfScore = 1 / (k + rank + 1)
      const current = fusionScores.get(skillId)
      fusionScores.set(skillId, {
        skill,
        score: (current?.score ?? 0) + rrfScore,
      })
    })
  }

  return Array.from(fusionScores.values()).sort((a, b) => b.score - a.score)
}

/**
 * Retrieve the most relevant skills for a given query using multi-vector RRF.
 * Fetches both org-scoped skills for the tenant and user-scoped skills for the user.
 * When a user skill has the same name as an org skill, the user version wins.
 */
export async function retrieveRelevantSkills(
  query: string,
  tenantId = 'default',
  userId?: string,
  conversationHistory: string[] = []
): Promise<SkillSearchResult[]> {
  const expandedQuery = [query, ...conversationHistory.slice(-3)].join(' ')
  const queryEmbedding = await embedText(expandedQuery)

  const allResults = await qdrant.search(COLLECTION, {
    vector: queryEmbedding,
    limit: TOP_K * 3 * 10,
    score_threshold: RELEVANCE_THRESHOLD,
    with_payload: true,
  })

  const storedTenantIds = [...new Set(allResults.map((r) => r.payload?.tenantId))]
  console.log(
    `[SkillRetriever] query="${query.slice(0, 60)}" | qdrant returned ${allResults.length} points ` +
    `| stored tenantIds=${JSON.stringify(storedTenantIds)} | looking for tenantId="${tenantId}" userId="${userId ?? 'none'}"`
  )

  // Keep points that belong to this tenant AND are either org-scoped or belong to this user
  const visible = allResults.filter((r) => {
    if (r.payload?.tenantId !== tenantId) return false
    const scope = r.payload?.scope as string | undefined
    if (scope === 'user') return r.payload?.userId === userId
    return true // org-scoped or legacy (no scope field)
  })

  const byDesc = visible.filter((r) => r.payload?.type === 'description').slice(0, TOP_K)
  const byTrig = visible.filter((r) => r.payload?.type === 'triggers').slice(0, TOP_K)
  const byEx   = visible.filter((r) => r.payload?.type === 'examples').slice(0, TOP_K)

  const toRanked = (results: typeof byDesc) =>
    results.map((r) => ({
      skillId: r.payload?.skillId as string,
      score: r.score,
      skill: r.payload as unknown as SkillMeta,
    }))

  const merged = reciprocalRankFusion([toRanked(byDesc), toRanked(byTrig), toRanked(byEx)])

  // User-scoped skills override org-scoped skills with the same name
  const deduped = deduplicateByScope(merged)
  return deduped.slice(0, TOP_K).map(({ skill, score }) => ({ skill, score }))
}

/**
 * When both an org and user skill share the same name, keep only the user version.
 */
function deduplicateByScope(
  skills: Array<{ skill: SkillMeta & { scope?: string }; score: number }>
): Array<{ skill: SkillMeta; score: number }> {
  const userSkillNames = new Set(
    skills
      .filter((s) => s.skill.scope === 'user')
      .map((s) => s.skill.name.toLowerCase())
  )

  return skills.filter((s) => {
    if (s.skill.scope !== 'user' && userSkillNames.has(s.skill.name.toLowerCase())) {
      return false
    }
    return true
  })
}

/** Format retrieved skills as a system prompt context block. */
export function buildSkillsContext(skills: SkillSearchResult[]): string {
  if (skills.length === 0) return ''

  const skillBlocks = skills
    .map(({ skill }) => {
      const bundled = skill.bundledFiles ?? {}
      const bundledContent = Object.entries(bundled)
        .map(([file, content]) => `### ${file}\n${content}`)
        .join('\n\n')

      return `<skill id="${skill.id}" name="${skill.name}">
${skill.rawContent}
${bundledContent}
</skill>`
    })
    .join('\n\n')

  return `## Active Skills Context\n${skillBlocks}`
}

/**
 * Build context for pinned skills fetched directly from Convex DB records.
 * These are force-included by the user regardless of vector search relevance.
 */
export function buildPinnedSkillsContext(
  dbSkills: Array<{ _id: string; name: string; description: string; systemPrompt: string }>
): SkillSearchResult[] {
  return dbSkills.map((s) => ({
    skill: {
      id: s._id,
      name: s.name,
      description: s.description,
      triggers: [],
      examples: [],
      constraints: [],
      filePath: '',
      rawContent: s.systemPrompt,
      bundledFiles: {},
    },
    score: 1.0,
  }))
}
