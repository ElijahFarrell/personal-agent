import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { workspace } from '@/mastra/workspace'
import type { Skill, SkillMetadata, SkillSearchResult } from '@mastra/core/workspace'

export interface SkillPreference {
  skillName: string
  isEnabled: boolean
  isPinned: boolean
}

export interface SkillLookupScope {
  tenantId?: string
  userId?: string
}

export interface SkillWithPreference extends SkillMetadata {
  isEnabled: boolean
  isPinned: boolean
  source?: 'workspace' | 'tenant' | 'both'
}

export interface ResolvedSkill {
  skill: Skill
  score: number
  isPinned: boolean
}

export interface SkillsHealthReport {
  stats: {
    availableCount: number
    workspaceCount: number
    tenantContentCount: number
    preferenceCount: number
    enabledCount: number
    pinnedCount: number
    missingPreferenceCount: number
  }
  issues: string[]
  missingPreferences: string[]
}

interface TenantSkillContentRecord {
  skillName: string
  description: string
  content: string
  sourceUrl?: string
  references?: Record<string, string>
}

const convex =
  process.env.NEXT_PUBLIC_CONVEX_URL
    ? new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
    : null

function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase()
}

function toTenantSkillMetadata(skill: TenantSkillContentRecord): SkillMetadata {
  return {
    name: skill.skillName,
    description: skill.description,
  } as SkillMetadata
}

function toTenantSkill(skill: TenantSkillContentRecord): Skill {
  return {
    name: skill.skillName,
    description: skill.description,
    instructions: skill.content,
    references: skill.references,
    sourceUrl: skill.sourceUrl,
  } as unknown as Skill
}

async function listWorkspaceSkills(): Promise<SkillMetadata[]> {
  try {
    return (await workspace.skills?.list()) ?? []
  } catch {
    return []
  }
}

async function getWorkspaceSkill(name: string): Promise<Skill | null> {
  try {
    return (await workspace.skills?.get(name)) ?? null
  } catch {
    const listed = await listWorkspaceSkills()
    const match = listed.find((skill) => normalizeSkillName(skill.name) === normalizeSkillName(name))
    if (!match) return null

    try {
      return (await workspace.skills?.get(match.name)) ?? null
    } catch {
      return null
    }
  }
}

async function searchWorkspaceSkills(
  query: string,
  topK: number
): Promise<SkillSearchResult[]> {
  try {
    return (await workspace.skills?.search(query, { topK })) ?? []
  } catch {
    return []
  }
}

async function getTenantSkillContent(
  scope?: SkillLookupScope
): Promise<TenantSkillContentRecord[]> {
  if (!convex || !scope?.tenantId) return []

  try {
    const skills = await convex.query(api.skillContent.getSkillContent, {
      tenantId: scope.tenantId as Id<'tenants'>,
      userId: scope.userId ? (scope.userId as Id<'users'>) : undefined,
    })

    return skills.map((skill) => ({
      skillName: skill.skillName,
      description: skill.description ?? '',
      content: skill.content,
      sourceUrl: skill.sourceUrl,
      references: skill.references as Record<string, string> | undefined,
    }))
  } catch {
    return []
  }
}

function scoreTenantSkillMatch(query: string, skill: TenantSkillContentRecord): number {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return 0

  const tokens = normalizedQuery
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)

  const name = skill.skillName.toLowerCase()
  const description = skill.description.toLowerCase()
  const content = skill.content.toLowerCase()

  let score = 0

  if (name.includes(normalizedQuery)) score += 6
  if (description.includes(normalizedQuery)) score += 4
  if (content.includes(normalizedQuery)) score += 2

  for (const token of tokens) {
    if (name.includes(token)) score += 2.5
    if (description.includes(token)) score += 1.5
    if (content.includes(token)) score += 0.5
  }

  return score
}

function dedupeSkillMetadata(
  workspaceSkills: SkillMetadata[],
  tenantSkills: SkillMetadata[]
): SkillMetadata[] {
  const merged = new Map<string, SkillMetadata>()

  for (const skill of workspaceSkills) {
    merged.set(normalizeSkillName(skill.name), skill)
  }

  for (const skill of tenantSkills) {
    const key = normalizeSkillName(skill.name)
    const existing = merged.get(key)
    if (existing) {
      merged.set(
        key,
        {
          ...existing,
          ...skill,
          description: skill.description || existing.description,
        } as SkillMetadata
      )
      continue
    }
    merged.set(key, skill)
  }

  return Array.from(merged.values())
}

/**
 * List all skills available to the current tenant and user.
 */
export async function listSkills(scope?: SkillLookupScope): Promise<SkillMetadata[]> {
  const [workspaceSkills, tenantSkills] = await Promise.all([
    listWorkspaceSkills(),
    getTenantSkillContent(scope),
  ])

  return dedupeSkillMetadata(
    workspaceSkills,
    tenantSkills.map(toTenantSkillMetadata)
  )
}

/**
 * Get a single skill's full content by name.
 */
export async function getSkill(
  name: string,
  scope?: SkillLookupScope
): Promise<Skill | null> {
  const workspaceSkill = await getWorkspaceSkill(name)
  if (workspaceSkill) return workspaceSkill

  const tenantSkills = await getTenantSkillContent(scope)
  const tenantSkill = tenantSkills.find(
    (skill) => normalizeSkillName(skill.skillName) === normalizeSkillName(name)
  )

  return tenantSkill ? toTenantSkill(tenantSkill) : null
}

/**
 * Search skills using the workspace engine plus tenant skill-content fallback.
 */
export async function searchSkills(
  query: string,
  topK = 5,
  scope?: SkillLookupScope
): Promise<SkillSearchResult[]> {
  const [workspaceResults, tenantSkills] = await Promise.all([
    searchWorkspaceSkills(query, topK),
    getTenantSkillContent(scope),
  ])

  const merged = new Map<string, SkillSearchResult>()

  for (const result of workspaceResults) {
    merged.set(normalizeSkillName(result.skillName), result)
  }

  for (const skill of tenantSkills) {
    const score = scoreTenantSkillMatch(query, skill)
    if (score <= 0) continue

    const key = normalizeSkillName(skill.skillName)
    const existing = merged.get(key)
    const normalizedScore = Math.min(score / 10, 0.99)

    if (!existing || normalizedScore > existing.score) {
      merged.set(
        key,
        {
          skillName: skill.skillName,
          score: normalizedScore,
        } as SkillSearchResult
      )
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/**
 * Merge workspace skills with user preferences from Convex.
 * Skills not in preferences default to enabled + unpinned.
 */
export function mergeSkillsWithPreferences(
  skills: SkillMetadata[],
  preferences: SkillPreference[]
): SkillWithPreference[] {
  const prefMap = new Map(
    preferences.map((preference) => [normalizeSkillName(preference.skillName), preference])
  )

  return skills.map((skill) => {
    const pref = prefMap.get(normalizeSkillName(skill.name))
    return {
      ...skill,
      isEnabled: pref?.isEnabled ?? true,
      isPinned: pref?.isPinned ?? false,
    }
  })
}

/**
 * Resolve the final set of skills for a chat message.
 *
 * 1. Search for relevant skills via workspace hybrid search
 * 2. Force-include pinned skills
 * 3. Filter out disabled skills
 * 4. Load full skill content for each result
 */
export async function resolveSkillsForMessage(
  message: string,
  preferences: SkillPreference[],
  topK = 5,
  scope?: SkillLookupScope
): Promise<ResolvedSkill[]> {
  const disabledNames = new Set(
    preferences.filter((p) => !p.isEnabled).map((p) => normalizeSkillName(p.skillName))
  )
  const pinnedNames = new Set(
    preferences
      .filter((p) => p.isPinned && p.isEnabled)
      .map((p) => normalizeSkillName(p.skillName))
  )

  const searchResults = await searchSkills(message, topK, scope)

  const matchedNames = new Set<string>()
  const resolved: ResolvedSkill[] = []

  for (const result of searchResults) {
    const normalizedName = normalizeSkillName(result.skillName)
    if (disabledNames.has(normalizedName)) continue
    if (matchedNames.has(normalizedName)) continue
    matchedNames.add(normalizedName)

    const skill = await getSkill(result.skillName, scope)
    if (!skill) continue

    resolved.push({
      skill,
      score: result.score,
      isPinned: pinnedNames.has(normalizedName),
    })
  }

  for (const pinnedName of pinnedNames) {
    if (matchedNames.has(pinnedName)) continue
    const skill = await getSkill(pinnedName, scope)
    if (!skill) continue

    resolved.push({
      skill,
      score: 1.0,
      isPinned: true,
    })
  }

  return resolved
}

/**
 * Build a system prompt context block from resolved skills.
 */
export function buildSkillsSystemContext(skills: ResolvedSkill[]): string {
  if (skills.length === 0) return ''

  const blocks = skills
    .map(({ skill }) => {
      return `<skill name="${skill.name}">\n${skill.instructions}\n</skill>`
    })
    .join('\n\n')

  return `## Active Skills Context\n${blocks}`
}

/**
 * Get a reference file from a skill.
 */
export async function getSkillReference(
  skillName: string,
  refPath: string
): Promise<string | null> {
  try {
    return (await workspace.skills?.getReference(skillName, refPath)) ?? null
  } catch {
    return null
  }
}

export async function getSkillsHealth(
  preferences: SkillPreference[],
  scope?: SkillLookupScope
): Promise<SkillsHealthReport> {
  const [workspaceSkills, tenantSkills, availableSkills] = await Promise.all([
    listWorkspaceSkills(),
    getTenantSkillContent(scope),
    listSkills(scope),
  ])

  const availableNames = new Set(
    availableSkills.map((skill) => normalizeSkillName(skill.name))
  )
  const missingPreferences = preferences
    .map((preference) => preference.skillName)
    .filter((skillName) => !availableNames.has(normalizeSkillName(skillName)))

  const issues: string[] = []
  if (preferences.length > 0 && availableSkills.length === 0) {
    issues.push('Preferences exist, but no skills are currently retrievable.')
  }
  if (missingPreferences.length > 0) {
    issues.push(
      `Some skill preferences do not map to retrievable skills: ${missingPreferences.join(', ')}.`
    )
  }

  return {
    stats: {
      availableCount: availableSkills.length,
      workspaceCount: workspaceSkills.length,
      tenantContentCount: tenantSkills.length,
      preferenceCount: preferences.length,
      enabledCount: preferences.filter((preference) => preference.isEnabled).length,
      pinnedCount: preferences.filter((preference) => preference.isPinned).length,
      missingPreferenceCount: missingPreferences.length,
    },
    issues,
    missingPreferences,
  }
}
