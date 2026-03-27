import { Workspace, LocalFilesystem, LocalSkillSource } from '@mastra/core/workspace'
import { ConvexSkillSource } from './convex-skill-source'
import { CompositeSkillSource } from './composite-skill-source'
import { qdrantVector, embedText } from './workspace'
import type { ResolvedPlatformConfig } from '@/platform/niche/types'

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
function workspaceCacheSuffix(platformResolved?: ResolvedPlatformConfig): string {
  if (!platformResolved) return 'legacy'
  const globs = [...platformResolved.skillIndexGlobs].sort().join('|')
  return `${platformResolved.nicheId}:${platformResolved.fullPlatformAccess}:${globs}`
}

/**
 * Drop cached workspaces for a tenant after skills change.
 * When `userId` is set, clears that user's entries and shared `org` entries (same Convex user id string).
 */
export function invalidateWorkspaceCache(tenantId: string, userId?: string): void {
  if (!userId) {
    invalidateWorkspaceCachesForTenant(tenantId)
    return
  }
  const prefixUser = `${tenantId}:${userId}:`
  const prefixOrg = `${tenantId}:org:`
  for (const key of [...workspaceCache.keys()]) {
    if (key.startsWith(prefixUser) || key.startsWith(prefixOrg)) {
      workspaceCache.delete(key)
    }
  }
}

/** Clear all cached workspaces. Call after reindex (filesystem skills changed). */
export function invalidateAllWorkspaceCaches(): void {
  workspaceCache.clear()
}

/** Invalidate every cached workspace for a tenant (any niche / full-access variant). */
export function invalidateWorkspaceCachesForTenant(tenantId: string): void {
  for (const key of workspaceCache.keys()) {
    if (key.startsWith(`${tenantId}:`)) workspaceCache.delete(key)
  }
}

/**
 * Creates a tenant-scoped workspace with org + user skills from Convex.
 * Both orchestrator and sub-agents receive this workspace to get
 * skill_search, skill_read, and skill tools for progressive skill loading.
 *
 * Per-tenant Qdrant collection is created and indexed on first use.
 * Workspaces are cached indefinitely; call invalidateWorkspaceCache when
 * skills change so the next chat re-indexes. Cache keys include niche skill
 * globs so different {@link ResolvedPlatformConfig} shapes do not collide.
 */
export async function createWorkspaceForTenant(
  tenantId: string,
  userId?: string,
  platformResolved?: ResolvedPlatformConfig
): Promise<Workspace> {
  const cacheKey = `${tenantId}:${userId ?? 'org'}:${workspaceCacheSuffix(platformResolved)}`
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

  const baseSkillPaths = ['/skills/**/*.md']
  const nichePaths = platformResolved?.skillIndexGlobs ?? []
  const autoIndexPaths = [...new Set([...baseSkillPaths, ...nichePaths])]

  const ws = new Workspace({
    id: `personal-agent-${tenantId}`,
    name: 'Personal Agent Workspace',
    filesystem: new LocalFilesystem({ basePath: process.cwd(), readOnly: true }),
    skills: ['/skills'],
    skillSource,
    bm25: true,
    vectorStore: qdrantVector,
    embedder: embedText,
    autoIndexPaths,
    searchIndexName: sanitizeIndexName(tenantId),
  })

  if (typeof ws.init === 'function') {
    await ws.init()
  }

  workspaceCache.set(cacheKey, ws)
  return ws
}
