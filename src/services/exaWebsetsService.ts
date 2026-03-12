/**
 * Exa Websets service — search for companies via Exa Websets API.
 * Uses exa.websets.create, waitUntilIdle, and items.list.
 */
import Exa, { CreateEnrichmentParametersFormat } from 'exa-js'
import { config } from '@/lib/config'

export interface ExaCompanyResult {
  companyName: string
  email?: string
  linkedinUrl?: string
  domain?: string
}

function getExa(): Exa {
  const apiKey = config.search.exaApiKey
  if (!apiKey?.trim()) {
    throw new Error(
      'Exa API key is not configured. Set EXA_API_KEY in your environment. ' +
        'Websets requires an Exa API key with Websets subscription.'
    )
  }
  return new Exa(apiKey)
}

function asStr(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim() ? val.trim() : undefined
}

function extractDomain(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

/**
 * Map Exa WebsetItem to ExaCompanyResult.
 * Exa returns: item.properties { type, company: { name }, url } and item.enrichments [{ format, result: string[] }].
 */
function mapItemToResult(item: Record<string, unknown>): ExaCompanyResult | null {
  const props = item.properties as Record<string, unknown> | undefined
  const companyObj = props?.company as Record<string, unknown> | undefined
  const legacyCompany = item.company as Record<string, unknown> | undefined
  const name = asStr(
    companyObj?.name ??
      props?.name ??
      legacyCompany?.name ??
      item.name ??
      item.title
  )
  if (!name) return null

  let email: string | undefined
  let linkedinUrl: string | undefined
  let domain: string | undefined

  const enrichmentsArr = item.enrichments as
    | Array<{ format?: string; result?: string[] | null }>
    | undefined
  if (Array.isArray(enrichmentsArr)) {
    const urlResults: string[] = []
    for (const e of enrichmentsArr) {
      const vals =
        e.result?.filter((v): v is string => typeof v === 'string') ?? []
      const first = vals[0]
      if (!first) continue
      const fmt = (e.format ?? '').toLowerCase()
      if (fmt === 'email') email = first
      else if (fmt === 'url') urlResults.push(first)
    }
    for (const u of urlResults) {
      const lower = u.toLowerCase()
      if (lower.includes('linkedin.com')) linkedinUrl = u
      else if (!domain) domain = extractDomain(u) ?? u
    }
  }

  const url = asStr(props?.url ?? companyObj?.url ?? item.url)
  if (url && !domain) domain = extractDomain(url)

  return {
    companyName: name,
    email,
    linkedinUrl,
    domain,
  }
}

const WEBSET_TIMEOUT_MS = 600_000 // 10 min — Exa FAQ: large/complex searches can take up to ~1 hour

function itemsToResults(
  items: Record<string, unknown>[],
  limit: number
): ExaCompanyResult[] {
  const results: ExaCompanyResult[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const result = mapItemToResult(item)
    if (!result) continue
    const key = result.companyName.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    results.push(result)
    if (results.length >= limit) break
  }
  return results
}

export interface WebsetSummary {
  id: string
  createdAt: string
  dashboardUrl?: string
}

/**
 * List all websets for the API key. Uses pagination to fetch all.
 */
export async function listAllWebsets(
  limit = 100
): Promise<WebsetSummary[]> {
  const exa = getExa()
  const websets = await exa.websets.getAll({ limit })
  return websets.map((w) => ({
    id: w.id,
    createdAt: w.createdAt,
    dashboardUrl: w.dashboardUrl,
  }))
}

/**
 * List all websets, fetch items from each, and return combined deduplicated results.
 */
export async function fetchAllPastWebsetResults(
  itemsPerWebset = 100
): Promise<{ websets: WebsetSummary[]; results: ExaCompanyResult[] }> {
  const exa = getExa()
  const websets = await exa.websets.getAll({ limit: 100 })
  const summaries: WebsetSummary[] = websets.map((w) => ({
    id: w.id,
    createdAt: w.createdAt,
    dashboardUrl: w.dashboardUrl,
  }))

  const seen = new Set<string>()
  const allResults: ExaCompanyResult[] = []

  for (const ws of websets) {
    try {
      const response = await exa.websets.items.list(ws.id, {
        limit: itemsPerWebset,
      })
      const items = (response.data ?? []) as Record<string, unknown>[]
      for (const item of items) {
        const result = mapItemToResult(item)
        if (!result) continue
        const key = result.companyName.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        allResults.push(result)
      }
    } catch (err) {
      console.warn(`[Exa] Failed to fetch items for webset ${ws.id}:`, err)
    }
  }

  return { websets: summaries, results: allResults }
}

/**
 * Fetch items from an existing webset by ID. Works for past/completed websets.
 * Partial results are available even for running websets.
 */
export async function fetchItemsByWebsetId(
  websetId: string,
  limit = 100
): Promise<ExaCompanyResult[]> {
  const exa = getExa()
  const response = await exa.websets.items.list(websetId, { limit })
  const items = (response.data ?? []) as Record<string, unknown>[]
  return itemsToResults(items, limit)
}

/**
 * Search for companies via Exa Websets. Creates a webset, waits for completion,
 * and returns mapped company results. On timeout, returns partial results if any.
 */
export async function searchCompaniesViaWebsets(
  query: string,
  count: number
): Promise<ExaCompanyResult[]> {
  const exa = getExa()

  const webset = await exa.websets.create({
    search: {
      query,
      count,
      entity: { type: 'company' },
    },
    enrichments: [
      {
        description: 'Primary contact or CEO email address',
        format: CreateEnrichmentParametersFormat.email,
      },
      {
        description: 'Company LinkedIn profile URL',
        format: CreateEnrichmentParametersFormat.url,
      },
      {
        description: 'Company website domain or URL',
        format: CreateEnrichmentParametersFormat.url,
      },
    ],
  })

  try {
    await exa.websets.waitUntilIdle(webset.id, {
      timeout: WEBSET_TIMEOUT_MS,
      pollInterval: 5000,
    })
  } catch (err) {
    // Timeout or other error — Exa docs: partial results available during long runs
    const response = await exa.websets.items.list(webset.id, { limit: count })
    const items = (response.data ?? []) as Record<string, unknown>[]
    if (items.length > 0) {
      return itemsToResults(items, count)
    }
    throw err
  }

  const response = await exa.websets.items.list(webset.id, { limit: count })
  const items = (response.data ?? []) as Record<string, unknown>[]
  return itemsToResults(items, count)
}
