import { NextRequest, NextResponse } from 'next/server'
import {
  readClerkSession,
  UnauthenticatedError,
} from '@/middleware/tenantContext'

interface SkillsShEntry {
  name: string
  owner: string
  repo: string
  description: string
  url: string
  installs?: number
  skillPath?: string
}

/**
 * GET /api/skills/browse — Browse available skills from the skills.sh directory.
 *
 * Uses the GitHub Search API to find repos with SKILL.md files.
 * Query params: ?q=search+term&page=1&per_page=20
 */
export async function GET(request: NextRequest) {
  try {
    try {
      await readClerkSession()
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      throw error
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '20', 10), 50)

    const githubQuery = query
      ? `filename:SKILL.md ${query}`
      : 'filename:SKILL.md path:skills'

    const apiUrl = `https://api.github.com/search/code?q=${encodeURIComponent(githubQuery)}&per_page=${perPage}&page=${page}`

    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_API_KEY
          ? { Authorization: `token ${process.env.GITHUB_API_KEY}` }
          : {}),
      },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'GitHub API rate limit exceeded. Try again later.' },
          { status: 429 }
        )
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const data = (await response.json()) as {
      total_count: number
      items: Array<{
        name: string
        path: string
        repository: {
          full_name: string
          html_url: string
          description: string | null
          stargazers_count: number
        }
      }>
    }

    const skills: SkillsShEntry[] = data.items
      .filter((item) => item.name === 'SKILL.md')
      .map((item) => {
        const [owner, repo] = item.repository.full_name.split('/')
        const skillDir = item.path.replace(/\/SKILL\.md$/, '')
        const skillName = skillDir.split('/').filter(Boolean).pop() || repo

        return {
          name: skillName,
          owner,
          repo,
          description: item.repository.description || '',
          url: `${item.repository.html_url}/tree/main/${skillDir}`,
          installs: item.repository.stargazers_count,
          skillPath: item.path.replace(/\/SKILL\.md$/, ''),
        }
      })

    return NextResponse.json({
      skills,
      total: data.total_count,
      page,
      perPage,
    })
  } catch (error) {
    console.error('[Skills Browse] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to browse skills' },
      { status: 500 }
    )
  }
}
