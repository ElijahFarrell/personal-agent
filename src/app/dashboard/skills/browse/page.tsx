'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Search,
  Download,
  ExternalLink,
  Star,
  Check,
  Loader2,
  Store,
  RefreshCw,
  Github,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { API_ROUTES } from '@/constants/api'

interface BrowseSkill {
  name: string
  owner: string
  repo: string
  description: string
  url: string
  installs?: number
  skillPath?: string
}

interface BrowseResult {
  skills: BrowseSkill[]
  total: number
  page: number
  perPage: number
}

type InstallState = 'idle' | 'installing' | 'installed' | 'error'

export default function SkillBrowsePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BrowseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [installUrl, setInstallUrl] = useState('')
  const [installStates, setInstallStates] = useState<Record<string, InstallState>>({})
  const [directInstalling, setDirectInstalling] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const fetchSkills = useCallback(async (searchQuery: string, page = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      params.set('page', String(page))
      params.set('per_page', '20')

      const res = await fetch(`${API_ROUTES.skillsBrowse}?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Browse failed' }))
        throw new Error(data.error)
      }
      const data: BrowseResult = await res.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch skills')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSkills('')
  }, [fetchSkills])

  function handleSearch(value: string) {
    setQuery(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchSkills(value)
    }, 400)
  }

  async function handleInstall(skill: BrowseSkill) {
    const key = `${skill.owner}/${skill.repo}/${skill.skillPath}`
    setInstallStates((prev) => ({ ...prev, [key]: 'installing' }))

    try {
      const source = skill.skillPath
        ? `https://github.com/${skill.owner}/${skill.repo}/tree/main/${skill.skillPath}`
        : `${skill.owner}/${skill.repo}`

      const res = await fetch(API_ROUTES.skillsInstall, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, name: skill.name }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Install failed' }))
        throw new Error(data.error)
      }

      setInstallStates((prev) => ({ ...prev, [key]: 'installed' }))
    } catch {
      setInstallStates((prev) => ({ ...prev, [key]: 'error' }))
      setTimeout(() => {
        setInstallStates((prev) => ({ ...prev, [key]: 'idle' }))
      }, 3000)
    }
  }

  async function handleDirectInstall(e: React.FormEvent) {
    e.preventDefault()
    if (!installUrl.trim()) return

    setDirectInstalling(true)
    try {
      const res = await fetch(API_ROUTES.skillsInstall, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: installUrl.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Install failed' }))
        throw new Error(data.error)
      }

      setInstallUrl('')
      setError('')
      alert('Skill installed successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install skill')
    } finally {
      setDirectInstalling(false)
    }
  }

  function getInstallState(skill: BrowseSkill): InstallState {
    const key = `${skill.owner}/${skill.repo}/${skill.skillPath}`
    return installStates[key] || 'idle'
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Link
                href="/dashboard/skills"
                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Skill Store
              </h1>
            </div>
            <p className="text-[15px] text-gray-400">
              Browse and install skills from GitHub and the open-source community.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchSkills(query)}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-800 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Direct Install */}
        <div className="rounded-xl border border-gray-800/80 bg-gray-900/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Github className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-medium text-white">Install from URL</h2>
          </div>
          <form onSubmit={handleDirectInstall} className="flex gap-3">
            <input
              type="text"
              value={installUrl}
              onChange={(e) => setInstallUrl(e.target.value)}
              placeholder="owner/repo, https://github.com/owner/repo, or https://github.com/owner/repo/tree/main/skills/my-skill"
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
            />
            <button
              type="submit"
              disabled={directInstalling || !installUrl.trim()}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
            >
              {directInstalling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Install
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-600">
            Paste a GitHub URL or owner/repo shorthand. Supports any repo with a SKILL.md file.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search skills…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-gray-600 focus:ring-1 focus:ring-brand-500/50"
          />
        </div>

        {error && (
          <p
            className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Results */}
        <section
          aria-label="Skills catalog"
          className="rounded-xl border border-gray-800/80 bg-gray-900/50"
        >
          {loading && !results ? (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              <p className="text-sm text-gray-500">Searching skills…</p>
            </div>
          ) : results && results.skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/60">
                <Store className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">No skills found</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Try a different search term, or install directly from a GitHub URL above.
                </p>
              </div>
            </div>
          ) : (
            <>
              {results && (
                <div className="border-b border-gray-800/60 px-5 py-3">
                  <p className="text-xs text-gray-500">
                    {results.total.toLocaleString()} results
                    {query && (
                      <>
                        {' '}for &ldquo;{query}&rdquo;
                      </>
                    )}
                  </p>
                </div>
              )}
              <ul className="divide-y divide-gray-800/60" role="list">
                {results?.skills.map((skill) => {
                  const state = getInstallState(skill)
                  const key = `${skill.owner}/${skill.repo}/${skill.skillPath}`

                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-800/20"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{skill.name}</p>
                          {skill.installs != null && skill.installs > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Star className="h-3 w-3" />
                              {skill.installs.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          <span className="font-medium text-gray-400">
                            {skill.owner}/{skill.repo}
                          </span>
                          {skill.description && (
                            <> &middot; {skill.description}</>
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <a
                          href={skill.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
                          aria-label="View on GitHub"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleInstall(skill)}
                          disabled={state === 'installing' || state === 'installed'}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                            state === 'installed'
                              ? 'border border-green-500/30 bg-green-500/10 text-green-400'
                              : state === 'error'
                                ? 'border border-red-500/30 bg-red-500/10 text-red-400'
                                : 'bg-brand-600 text-white hover:bg-brand-500'
                          }`}
                        >
                          {state === 'installing' && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          {state === 'installed' && <Check className="h-3 w-3" />}
                          {state === 'idle' && <Download className="h-3 w-3" />}
                          {state === 'error' && <Download className="h-3 w-3" />}
                          {state === 'installing'
                            ? 'Installing…'
                            : state === 'installed'
                              ? 'Installed'
                              : state === 'error'
                                ? 'Failed'
                                : 'Install'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>

        {/* Pagination */}
        {results && results.total > results.perPage && (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fetchSkills(query, results.page - 1)}
              disabled={results.page <= 1 || loading}
              className="rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs tabular-nums text-gray-500">
              Page {results.page} of {Math.ceil(results.total / results.perPage)}
            </span>
            <button
              type="button"
              onClick={() => fetchSkills(query, results.page + 1)}
              disabled={
                results.page >= Math.ceil(results.total / results.perPage) || loading
              }
              className="rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
