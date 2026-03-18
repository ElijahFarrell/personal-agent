import { Workspace, LocalFilesystem, LocalSkillSource } from '@mastra/core/workspace'
import { ConvexSkillSource } from './convex-skill-source'
import { CompositeSkillSource } from './composite-skill-source'
import { qdrantVector, embedText } from './workspace'

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || ''

const localSource = new LocalSkillSource({ basePath: process.cwd() })

const workspaceCache = new Map<string, Workspace>()

function sanitizeIndexName(tenantId: string): string {
  return `pa_${tenantId.replace(/[^a-zA-Z0-9_]/g, '_')}`
}

/**
 * Invalidate cached workspace for a tenant. Call when skills are added/updated
 * (e.g. after author or install) so the next chat picks up the new skills.
 */
export function invalidateWorkspaceCache(tenantId: string, userId?: string): void {
  const cacheKey = `${tenantId}:${userId ?? 'org'}`
  workspaceCache.delete(cacheKey)
  // Also invalidate org-level cache (userId undefined) so org skills refresh
  if (userId) {
    workspaceCache.delete(`${tenantId}:org`)
  }
}

/** Clear all cached workspaces. Call after reindex (filesystem skills changed). */
export function invalidateAllWorkspaceCaches(): void {
  workspaceCache.clear()
}

/**
 * Creates a tenant-scoped workspace with org + user skills from Convex.
 * Both orchestrator and sub-agents receive this workspace to get
 * skill_search, skill_read, and skill tools for progressive skill loading.
 *
 * Per-tenant Qdrant collection is created and indexed on first use.
 * Workspaces are cached indefinitely; call invalidateWorkspaceCache when
 * skills change so the next chat re-indexes.
 */
export async function createWorkspaceForTenant(
  tenantId: string,
  userId?: string
): Promise<Workspace> {
  const cacheKey = `${tenantId}:${userId ?? 'org'}`
  const cached = workspaceCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const convexSource =
    CONVEX_URL
      ? new ConvexSkillSource({
          convexUrl: CONVEX_URL,
          tenantId,
          userId,
        })
      : null

  const skillSource = convexSource
    ? new CompositeSkillSource([localSource, convexSource])
    : localSource

  const ws = new Workspace({
    id: `personal-agent-${tenantId}`,
    name: 'Personal Agent Workspace',
    filesystem: new LocalFilesystem({ basePath: process.cwd(), readOnly: true }),
    skills: ['/skills'],
    skillSource,
    bm25: true,
    vectorStore: qdrantVector,
    embedder: embedText,
    autoIndexPaths: ['/skills/**/*.md'],
    searchIndexName: sanitizeIndexName(tenantId),
  })

  if (typeof ws.init === 'function') {
    await ws.init()
  }

  workspaceCache.set(cacheKey, ws)
  return ws
}
