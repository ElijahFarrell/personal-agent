import type {
  SkillSource,
  SkillSourceEntry,
  SkillSourceStat,
} from '@mastra/core/workspace'

/**
 * Merges multiple SkillSource implementations into a single virtual directory.
 *
 * When listing the root, returns skill directories from all sources.
 * For individual skill reads, checks sources in order (first match wins).
 * Later sources override earlier ones when skill names collide.
 */
export class CompositeSkillSource implements SkillSource {
  private sources: SkillSource[]

  constructor(sources: SkillSource[]) {
    this.sources = sources
  }

  async exists(path: string): Promise<boolean> {
    for (const source of this.sources) {
      try {
        if (await source.exists(path)) return true
      } catch {
        continue
      }
    }
    return false
  }

  async stat(path: string): Promise<SkillSourceStat> {
    for (const source of [...this.sources].reverse()) {
      try {
        if (await source.exists(path)) {
          return await source.stat(path)
        }
      } catch {
        continue
      }
    }
    throw new Error(`Path not found: ${path}`)
  }

  async readFile(path: string): Promise<string | Buffer> {
    for (const source of [...this.sources].reverse()) {
      try {
        if (await source.exists(path)) {
          return await source.readFile(path)
        }
      } catch {
        continue
      }
    }
    throw new Error(`File not found: ${path}`)
  }

  async readdir(path: string): Promise<SkillSourceEntry[]> {
    const allEntries = new Map<string, SkillSourceEntry>()

    for (const source of this.sources) {
      try {
        const entries = await source.readdir(path)
        for (const entry of entries) {
          allEntries.set(entry.name, entry)
        }
      } catch {
        continue
      }
    }

    return Array.from(allEntries.values())
  }
}
