import JSZip from 'jszip'

/** Shared parsing for SKILL.md (YAML frontmatter + body) — used by skillsService and dashboard import UI. */

export interface ParsedSkillFrontmatter {
  name: string
  description: string
  /** Markdown body after frontmatter (what we store as skill `content` for authored skills). */
  content: string
}

/** Parse YAML frontmatter from SKILL.md. Returns name, description, and body content. */
export function parseSkillFrontmatter(raw: string): ParsedSkillFrontmatter {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  const body = match ? match[2] : raw
  const front = match ? match[1] : ''

  let name = ''
  let description = ''

  for (const line of front.split('\n')) {
    const nameMatch = line.match(/^name:\s*(.+)$/)
    if (nameMatch) name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '')
    const descMatch = line.match(/^description:\s*(.+)$/)
    if (descMatch) description = descMatch[1].trim().replace(/^['"]|['"]$/g, '')
  }

  return { name: name || 'unknown', description, content: body.trim() }
}

/** For agent discovery, both name and description should be present in frontmatter. */
export function validateSkillFrontmatter(parsed: ParsedSkillFrontmatter): string | null {
  if (!parsed.name.trim() || parsed.name === 'unknown') {
    return 'SKILL.md must include a `name` field in YAML frontmatter.'
  }
  if (!parsed.description.trim()) {
    return 'SKILL.md must include a `description` field in YAML frontmatter.'
  }
  return null
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, '')
  return base.replace(/\.(md|txt|markdown)$/i, '').trim() || base
}

function normalizeRelPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '')
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'UTF-8')
  })
}

export interface SkillFolderParseResult {
  skillName: string
  description: string
  content: string
  references: Record<string, string>
  warnings: string[]
}

/**
 * Parse a skill folder from a directory picker (`webkitRelativePath`).
 * Expects one SKILL.md; loads `references/**` relative to the skill directory (same layout as GitHub install).
 */
export async function parseSkillFolderFromFileList(
  files: FileList
): Promise<SkillFolderParseResult> {
  const list = Array.from(files)
  const skillMdFiles = list.filter((f) => f.name.toLowerCase() === 'skill.md')

  if (skillMdFiles.length === 0) {
    throw new Error('No SKILL.md found in the selected folder.')
  }
  if (skillMdFiles.length > 1) {
    throw new Error('Multiple SKILL.md files found. Select a folder that contains a single skill.')
  }

  const skillMd = skillMdFiles[0]
  const rel = normalizeRelPath(skillMd.webkitRelativePath || skillMd.name)
  const dir = rel.toLowerCase().endsWith('/skill.md')
    ? rel.slice(0, -'/skill.md'.length)
    : rel.includes('/')
      ? rel.replace(/\/SKILL\.md$/i, '')
      : ''

  const raw = await readFileAsText(skillMd)
  const parsed = parseSkillFrontmatter(raw)
  const err = validateSkillFrontmatter(parsed)
  if (err) throw new Error(err)

  const references: Record<string, string> = {}
  const warnings: string[] = []
  const refPrefix = dir ? `${dir}/references/` : 'references/'

  for (const f of list) {
    if (f === skillMd) continue
    const p = normalizeRelPath(f.webkitRelativePath || f.name)
    const lower = p.toLowerCase()
    const prefixLower = refPrefix.toLowerCase()
    if (!lower.startsWith(prefixLower)) {
      if (p !== rel) {
        warnings.push(`Ignored (not under references/): ${p}`)
      }
      continue
    }
    const key = p.slice(refPrefix.length)
    if (!key || key.endsWith('/')) continue
    references[key] = await readFileAsText(f)
  }

  return {
    skillName: parsed.name.trim(),
    description: parsed.description.trim(),
    content: parsed.content,
    references,
    warnings,
  }
}

function zipBasename(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] ?? ''
}

/**
 * Parse a skill packaged as a ZIP (one SKILL.md plus optional `references/` tree).
 */
export async function parseSkillZipFromArrayBuffer(
  buffer: ArrayBuffer
): Promise<SkillFolderParseResult> {
  const zip = await JSZip.loadAsync(buffer)
  const paths: string[] = []
  zip.forEach((relPath, entry) => {
    if (!entry.dir) paths.push(relPath.replace(/\\/g, '/'))
  })

  const skillPaths = paths.filter((p) => zipBasename(p).toLowerCase() === 'skill.md')
  if (skillPaths.length === 0) {
    throw new Error('No SKILL.md found in the ZIP archive.')
  }
  if (skillPaths.length > 1) {
    throw new Error('Multiple SKILL.md files found. Use one skill per ZIP.')
  }

  const skillPath = skillPaths[0]
  const skillDir = skillPath.includes('/')
    ? skillPath.replace(/\/SKILL\.md$/i, '')
    : ''

  const fileEntry = zip.file(skillPath)
  if (!fileEntry) throw new Error('Could not read SKILL.md from ZIP.')
  const raw = await fileEntry.async('string')

  const parsed = parseSkillFrontmatter(raw)
  const err = validateSkillFrontmatter(parsed)
  if (err) throw new Error(err)

  const references: Record<string, string> = {}
  const warnings: string[] = []
  const refPrefix = skillDir ? `${skillDir}/references/` : 'references/'

  for (const p of paths) {
    if (p === skillPath) continue
    if (!p.toLowerCase().startsWith(refPrefix.toLowerCase())) {
      warnings.push(`Ignored (not under references/): ${p}`)
      continue
    }
    const key = p.slice(refPrefix.length)
    if (!key || key.endsWith('/')) continue
    const refFile = zip.file(p)
    if (refFile) references[key] = await refFile.async('string')
  }

  return {
    skillName: parsed.name.trim(),
    description: parsed.description.trim(),
    content: parsed.content,
    references,
    warnings,
  }
}
