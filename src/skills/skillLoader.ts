import { readdir, readFile } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import type { SkillMeta } from '@/types'

const SKILLS_DIR = path.join(process.cwd(), 'skills')

function parseSkillMarkdown(content: string, filePath: string): SkillMeta | null {
  try {
    const { data, content: body } = matter(content)

    const nameMatch = body.match(/^#\s+(?:Skill:\s+)?(.+)$/m)
    const name = data.name ?? nameMatch?.[1]?.trim() ?? path.basename(path.dirname(filePath))

    const descriptionMatch = body.match(/## Description\s+([\s\S]+?)(?=##|$)/)
    const description = data.description ?? descriptionMatch?.[1]?.trim() ?? ''

    const triggersMatch = body.match(/## (?:When to Use This Skill|Triggers)\s+([\s\S]+?)(?=##|$)/)
    const triggersRaw = triggersMatch?.[1] ?? ''
    const triggers = triggersRaw
      .split('\n')
      .map((line: string) => line.replace(/^[-*]\s*["']?|["']$/g, '').trim())
      .filter(Boolean)

    const examplesMatch = body.match(/## Examples\s+([\s\S]+?)(?=##|$)/)
    const examplesRaw = examplesMatch?.[1] ?? ''
    const examples: Array<{ query: string; action: string }> = []
    const examplePairs = examplesRaw.split(/\*\*Query:\*\*/).slice(1)
    for (const pair of examplePairs) {
      const actionSplit = pair.split('**Action:**')
      if (actionSplit.length >= 1) {
        examples.push({
          query: (actionSplit[0] ?? '').trim().replace(/^["']|["']$/g, ''),
          action: (actionSplit[1] ?? '').split('**')[0].trim(),
        })
      }
    }

    const constraintsMatch = body.match(/## Constraints\s+([\s\S]+?)(?=##|$)/)
    const constraintsRaw = constraintsMatch?.[1] ?? ''
    const constraints = constraintsRaw
      .split('\n')
      .map((line: string) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)

    const id = data.id ?? name.toLowerCase().replace(/\s+/g, '-')

    return {
      id,
      name,
      description,
      triggers,
      examples,
      constraints,
      filePath,
      rawContent: content,
      bundledFiles: {},
    }
  } catch {
    console.error(`Failed to parse skill at ${filePath}`)
    return null
  }
}

async function loadBundledFiles(skillDir: string): Promise<Record<string, string>> {
  const entries = await readdir(skillDir)
  const bundled: Record<string, string> = {}

  for (const entry of entries) {
    if (entry.endsWith('.md') && entry !== 'SKILL.md') {
      bundled[entry] = await readFile(path.join(skillDir, entry), 'utf-8')
    }
  }

  return bundled
}

export async function loadAllSkills(): Promise<SkillMeta[]> {
  const skills: SkillMeta[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.name === 'SKILL.md') {
        const content = await readFile(fullPath, 'utf-8')
        const skill = parseSkillMarkdown(content, fullPath)
        if (skill) {
          skill.bundledFiles = await loadBundledFiles(dir)
          skills.push(skill)
        }
      }
    }
  }

  await walk(SKILLS_DIR)
  return skills
}

export async function loadSkillById(id: string): Promise<SkillMeta | null> {
  const skills = await loadAllSkills()
  return skills.find((s) => s.id === id) ?? null
}
