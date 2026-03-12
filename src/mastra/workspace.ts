import { readdir } from 'fs/promises'
import { join } from 'path'
import { Workspace, LocalFilesystem, LocalSkillSource } from '@mastra/core/workspace'
import { QdrantVector } from '@mastra/qdrant'
import { embed, gateway } from 'ai'
import { ConvexSkillSource } from './convex-skill-source'
import { CompositeSkillSource } from './composite-skill-source'

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333'
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || undefined
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || ''
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || ''

const qdrantVector = new QdrantVector({
  id: 'personal-agent-qdrant',
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
})

async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: gateway.embedding('openai/text-embedding-3-small'),
    value: text,
  })
  return embedding
}

const localSource = new LocalSkillSource({ basePath: process.cwd() })

const convexSkillSource =
  CONVEX_URL && DEFAULT_TENANT_ID
    ? new ConvexSkillSource({
        convexUrl: CONVEX_URL,
        tenantId: DEFAULT_TENANT_ID,
      })
    : null

const skillSource = convexSkillSource
  ? new CompositeSkillSource([localSource, convexSkillSource])
  : localSource

export const workspace = new Workspace({
  id: 'personal-agent',
  name: 'Personal Agent Workspace',
  filesystem: new LocalFilesystem({ basePath: process.cwd(), readOnly: true }),
  skills: ['/skills'],
  skillSource,
  bm25: true,
  vectorStore: qdrantVector,
  embedder: embedText,
  autoIndexPaths: ['/skills/**/*.md'],
})

/** Log skill source configuration on first load. */
void (async () => {
  let localSkillCount = 0
  try {
    const entries = await readdir(join(process.cwd(), 'skills'), {
      withFileTypes: true,
    })
    localSkillCount = entries.filter((e) => e.isDirectory()).length
  } catch {
    /* skills dir may not exist */
  }
  console.log('[Workspace] Skill source config:', {
    qdrant: !!QDRANT_URL,
    convex: !!(CONVEX_URL && DEFAULT_TENANT_ID),
    localSkillCount,
  })
})()

export { qdrantVector, embedText, convexSkillSource, skillSource }
