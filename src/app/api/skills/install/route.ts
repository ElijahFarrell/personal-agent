import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { getTenantContext } from '@/middleware/tenantContext'
import { workspace, convexSkillSource } from '@/mastra/workspace'
import { invalidateWorkspaceCache } from '@/mastra/createWorkspaceForTenant'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

interface GithubSkillInput {
  /** GitHub URL or owner/repo shorthand, optionally with skill path */
  source: string
  /** Override name (defaults to directory name) */
  name?: string
}

function parseGithubSource(source: string): {
  owner: string
  repo: string
  branch: string
  skillPath: string
} {
  let url: URL | null = null

  try {
    url = new URL(source)
  } catch {
    // "owner/repo" or "owner/repo/skills/skill-name" shorthand
    const parts = source.split('/')
    if (parts.length < 2) throw new Error('Invalid source format')
    return {
      owner: parts[0],
      repo: parts[1],
      branch: 'main',
      skillPath: parts.length > 2 ? parts.slice(2).join('/') : '',
    }
  }

  if (!url.hostname.includes('github.com')) {
    throw new Error('Only GitHub URLs are supported')
  }

  const pathParts = url.pathname.replace(/^\//, '').split('/')
  const owner = pathParts[0]
  const repo = pathParts[1]

  // Handle /tree/branch/path format
  if (pathParts[2] === 'tree') {
    const branch = pathParts[3] || 'main'
    const skillPath = pathParts.slice(4).join('/')
    return { owner, repo, branch, skillPath }
  }

  // Handle /blob/branch/path format
  if (pathParts[2] === 'blob') {
    const branch = pathParts[3] || 'main'
    const skillPath = pathParts.slice(4).join('/')
    return { owner, repo, branch, skillPath }
  }

  return { owner, repo, branch: 'main', skillPath: pathParts.slice(2).join('/') }
}

async function fetchGithubContent(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string> {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`
  const response = await fetch(rawUrl, {
    headers: process.env.GITHUB_TOKEN
      ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
      : {},
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${rawUrl}: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

async function fetchGithubTree(
  owner: string,
  repo: string,
  branch: string,
  dirPath: string
): Promise<Array<{ path: string; type: string }>> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch tree: ${response.status}`)
  }

  const data = (await response.json()) as { tree: Array<{ path: string; type: string }> }
  const prefix = dirPath ? `${dirPath}/` : ''
  return data.tree.filter(
    (item: { path: string; type: string }) => item.type === 'blob' && item.path.startsWith(prefix)
  )
}

function extractDescription(content: string): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed.slice(0, 200)
    }
  }
  return 'Installed skill'
}

/**
 * POST /api/skills/install — Install a skill from GitHub/skills.sh.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getTenantContext()
    const body = (await request.json()) as GithubSkillInput

    if (!body.source) {
      return NextResponse.json({ error: 'source is required' }, { status: 400 })
    }

    const dbUser = await convex.query(api.users.getUserByClerkUserId, {
      clerkUserId: userId,
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { owner, repo, branch, skillPath } = parseGithubSource(body.source)

    const skillMdPath = skillPath
      ? skillPath.endsWith('SKILL.md')
        ? skillPath
        : `${skillPath}/SKILL.md`
      : 'SKILL.md'

    const skillContent = await fetchGithubContent(owner, repo, branch, skillMdPath)

    const skillDir = skillMdPath.replace(/\/SKILL\.md$/, '')
    const skillName =
      body.name || skillDir.split('/').filter(Boolean).pop() || `${owner}-${repo}`

    let references: Record<string, string> = {}
    try {
      const tree = await fetchGithubTree(owner, repo, branch, skillDir)
      const refPrefix = `${skillDir}/references/`
      const refFiles = tree.filter((f) => f.path.startsWith(refPrefix))

      const refEntries = await Promise.all(
        refFiles.map(async (f) => {
          const content = await fetchGithubContent(owner, repo, branch, f.path)
          const relativePath = f.path.replace(refPrefix, '')
          return [relativePath, content] as const
        })
      )
      references = Object.fromEntries(refEntries)
    } catch {
      // No references directory — that's fine
    }

    const sourceUrl = `https://github.com/${owner}/${repo}/${skillPath ? `tree/${branch}/${skillPath}` : ''}`
    const description = extractDescription(skillContent)

    const skillId = await convex.mutation(api.skillContent.installSkill, {
      tenantId: dbUser.tenantId,
      userId: dbUser._id,
      scope: 'org',
      skillName,
      description,
      content: skillContent,
      sourceUrl,
      references: Object.keys(references).length > 0 ? references : undefined,
    })

    try {
      await convex.mutation(api.skills.createSkill, {
        tenantId: dbUser.tenantId,
        userId: dbUser._id,
        scope: 'org',
        skillName,
        isEnabled: true,
      })
    } catch {
      // Preference record may already exist
    }

    convexSkillSource?.invalidateCache()
    invalidateWorkspaceCache(String(dbUser.tenantId))
    await workspace.skills?.refresh()

    return NextResponse.json({
      success: true,
      skill: {
        id: skillId,
        name: skillName,
        description,
        source: sourceUrl,
        hasReferences: Object.keys(references).length > 0,
      },
    })
  } catch (error) {
    console.error('[Skills Install] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to install skill' },
      { status: 500 }
    )
  }
}
