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

let _dbgEmbedCallCount = 0
async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: gateway.embedding('openai/text-embedding-3-small'),
    value: text,
  })
  // #region agent log
  _dbgEmbedCallCount++
  if (_dbgEmbedCallCount <= 3 || embedding.length !== 1536) {
    console.log('[DBG:a3b5eb] embedText', JSON.stringify({dim:embedding.length,call:_dbgEmbedCallCount,textLen:text.length}))
    fetch('http://127.0.0.1:7354/ingest/1a725a3c-99e0-4022-8d2b-3888a9f3a42c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a3b5eb'},body:JSON.stringify({sessionId:'a3b5eb',location:'workspace.ts:embedText',message:'embedding result',data:{embeddingDim:embedding.length,callCount:_dbgEmbedCallCount,textLen:text.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  }
  // #endregion
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
  searchIndexName: 'personal_agent_skills',
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
