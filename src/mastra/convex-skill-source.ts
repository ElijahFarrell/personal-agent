import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type {
  SkillSource,
  SkillSourceEntry,
  SkillSourceStat,
} from '@mastra/core/workspace'

interface ConvexSkillRecord {
  _id: string
  skillName: string
  description: string
  content: string
  source: string
  sourceUrl?: string
  references?: Record<string, string>
  createdAt: number
  updatedAt: number
}

/**
 * A SkillSource that reads user-authored and installed skills from Convex.
 *
 * Presents skills as a virtual filesystem:
 *   /                               (root listing — lists skill directories)
 *   /{skillName}/                   (skill directory)
 *   /{skillName}/SKILL.md           (skill content)
 *   /{skillName}/references/{name}  (reference files)
 *
 * This plugs into Mastra's WorkspaceSkillsImpl so user skills
 * are discoverable alongside filesystem skills.
 */
export class ConvexSkillSource implements SkillSource {
  private convex: ConvexHttpClient
  private tenantId: string
  private userId?: string
  private cache: Map<string, ConvexSkillRecord> = new Map()
  private lastFetch = 0
  private readonly CACHE_TTL = 5000

  constructor(opts: { convexUrl: string; tenantId: string; userId?: string }) {
    this.convex = new ConvexHttpClient(opts.convexUrl)
    this.tenantId = opts.tenantId
    this.userId = opts.userId
  }

  private async loadSkills(): Promise<Map<string, ConvexSkillRecord>> {
    if (Date.now() - this.lastFetch < this.CACHE_TTL && this.cache.size > 0) {
      return this.cache
    }

    const skills = await this.convex.query(api.skillContent.getSkillContent, {
      tenantId: this.tenantId as Id<'tenants'>,
      userId: this.userId ? (this.userId as Id<'users'>) : undefined,
    })

    this.cache = new Map()
    for (const skill of skills) {
      this.cache.set(skill.skillName, skill as unknown as ConvexSkillRecord)
    }
    this.lastFetch = Date.now()
    return this.cache
  }

  /** Invalidate the internal cache so the next operation re-fetches from Convex. */
  invalidateCache(): void {
    this.lastFetch = 0
    this.cache.clear()
  }

  private parsePath(path: string): { skillName?: string; file?: string; refPath?: string } {
    const clean = path.replace(/^\/+|\/+$/g, '')
    if (!clean) return {}

    const parts = clean.split('/')
    const skillName = parts[0]

    if (parts.length === 1) return { skillName }
    if (parts[1] === 'SKILL.md') return { skillName, file: 'SKILL.md' }
    if (parts[1] === 'references' && parts[2]) {
      return { skillName, refPath: parts.slice(2).join('/') }
    }

    return { skillName, file: parts.slice(1).join('/') }
  }

  async exists(path: string): Promise<boolean> {
    const { skillName, file, refPath } = this.parsePath(path)
    const skills = await this.loadSkills()

    if (!skillName) return skills.size > 0
    const skill = skills.get(skillName)
    if (!skill) return false
    if (!file && !refPath) return true
    if (file === 'SKILL.md') return true
    if (refPath) {
      const refs = (skill.references ?? {}) as Record<string, string>
      return refPath in refs
    }
    return false
  }

  async stat(path: string): Promise<SkillSourceStat> {
    const { skillName, file, refPath } = this.parsePath(path)
    const skills = await this.loadSkills()

    if (!skillName) {
      return {
        name: '',
        type: 'directory',
        size: 0,
        createdAt: new Date(),
        modifiedAt: new Date(),
      }
    }

    const skill = skills.get(skillName)
    if (!skill) throw new Error(`Skill not found: ${skillName}`)

    if (!file && !refPath) {
      return {
        name: skillName,
        type: 'directory',
        size: 0,
        createdAt: new Date(skill.createdAt),
        modifiedAt: new Date(skill.updatedAt),
      }
    }

    if (file === 'SKILL.md') {
      return {
        name: 'SKILL.md',
        type: 'file',
        size: Buffer.byteLength(skill.content, 'utf-8'),
        createdAt: new Date(skill.createdAt),
        modifiedAt: new Date(skill.updatedAt),
        mimeType: 'text/markdown',
      }
    }

    if (refPath) {
      const refs = (skill.references ?? {}) as Record<string, string>
      const refContent = refs[refPath]
      if (!refContent) throw new Error(`Reference not found: ${refPath}`)
      return {
        name: refPath.split('/').pop()!,
        type: 'file',
        size: Buffer.byteLength(refContent, 'utf-8'),
        createdAt: new Date(skill.createdAt),
        modifiedAt: new Date(skill.updatedAt),
        mimeType: 'text/markdown',
      }
    }

    throw new Error(`Path not found: ${path}`)
  }

  async readFile(path: string): Promise<string> {
    const { skillName, file, refPath } = this.parsePath(path)
    const skills = await this.loadSkills()

    if (!skillName) throw new Error('Cannot read root as file')

    const skill = skills.get(skillName)
    if (!skill) throw new Error(`Skill not found: ${skillName}`)

    if (file === 'SKILL.md') return skill.content
    if (refPath) {
      const refs = (skill.references ?? {}) as Record<string, string>
      const refContent = refs[refPath]
      if (!refContent) throw new Error(`Reference not found: ${refPath}`)
      return refContent
    }

    throw new Error(`Cannot read: ${path}`)
  }

  async readdir(path: string): Promise<SkillSourceEntry[]> {
    const { skillName, file } = this.parsePath(path)
    const skills = await this.loadSkills()

    if (!skillName) {
      return Array.from(skills.keys()).map((name) => ({
        name,
        type: 'directory' as const,
      }))
    }

    const skill = skills.get(skillName)
    if (!skill) return []

    if (!file) {
      const entries: SkillSourceEntry[] = [
        { name: 'SKILL.md', type: 'file' },
      ]
      const refs = (skill.references ?? {}) as Record<string, string>
      if (Object.keys(refs).length > 0) {
        entries.push({ name: 'references', type: 'directory' })
      }
      return entries
    }

    if (file === 'references' || path.endsWith('/references')) {
      const refs = (skill.references ?? {}) as Record<string, string>
      return Object.keys(refs).map((name) => ({
        name,
        type: 'file' as const,
      }))
    }

    return []
  }
}
