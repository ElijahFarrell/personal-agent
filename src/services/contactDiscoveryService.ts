/**
 * Contact discovery service — finds CEO/executive emails for companies.
 * Uses Exa for company/CEO research and Hunter.io for email verification.
 */
import Exa from 'exa-js'
import { config } from '@/lib/config'

const exaClient = config.search.exaApiKey
  ? new Exa(config.search.exaApiKey)
  : null

export interface CompanyResearch {
  companyName: string
  businessModel?: string
  ceoName?: string
  domain?: string
  summary?: string
}

export interface ContactResult {
  email: string
  confidence: number
  position?: string
  firstName?: string
  lastName?: string
}

function parseFirstLastName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
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
 * Research a company via Exa: business model, CEO name, domain.
 */
export async function researchCompany(
  companyName: string,
  options?: { numResults?: number }
): Promise<CompanyResearch> {
  const result: CompanyResearch = { companyName }

  if (!exaClient) {
    return result
  }

  try {
    const query = `What is the core business model of ${companyName} and who is the CEO?`
    const response = await exaClient.search(query, {
      numResults: options?.numResults ?? 5,
      contents: { text: { maxCharacters: 2000 } },
    })

    const results = response.results ?? []
    const combined = results
      .map((r) => (r as { text?: string }).text ?? '')
      .join('\n\n')

    if (combined) {
      result.summary = combined.slice(0, 1500)
    }

    const ceoMatch = combined.match(
      /(?:CEO|chief executive officer)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
    )
    if (ceoMatch) {
      result.ceoName = ceoMatch[1].trim()
    }

    const domainMatch = combined.match(
      /(?:website|domain|\.com)[:\s]*(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.[a-z]{2,})/i
    )
    if (domainMatch) {
      result.domain = domainMatch[1].toLowerCase()
    }

    for (const r of results) {
      const url = (r as { url?: string }).url
      if (url && url.includes(companyName.replace(/\s+/g, '').toLowerCase())) {
        const d = extractDomain(url)
        if (d && !result.domain) result.domain = d
      }
    }
  } catch (err) {
    console.warn(
      `[ContactDiscovery] Exa research failed for ${companyName}:`,
      (err as Error).message
    )
  }

  return result
}

/**
 * Find verified email for a person at a domain via Hunter.io.
 */
export async function findEmail(
  domain: string,
  fullName: string
): Promise<ContactResult | null> {
  const apiKey = config.hunter.apiKey
  if (!apiKey?.trim()) return null

  const { firstName, lastName } = parseFirstLastName(fullName)
  if (!firstName || !domain) return null

  try {
    const params = new URLSearchParams({
      domain: domain.replace(/^www\./, ''),
      first_name: firstName,
      api_key: apiKey,
    })
    if (lastName) params.set('last_name', lastName)

    const res = await fetch(
      `https://api.hunter.io/v2/email-finder?${params.toString()}`
    )
    if (!res.ok) return null

    const data = (await res.json()) as {
      data?: { email?: string; score?: number; position?: string; first_name?: string; last_name?: string }
    }
    const d = data.data
    if (!d?.email) return null

    return {
      email: d.email,
      confidence: d.score ?? 0,
      position: d.position,
      firstName: d.first_name,
      lastName: d.last_name,
    }
  } catch (err) {
    console.warn(
      `[ContactDiscovery] Hunter lookup failed for ${fullName} @ ${domain}:`,
      (err as Error).message
    )
    return null
  }
}

/**
 * Full pipeline: research company, then find CEO email.
 */
export async function findCEOEmail(
  companyName: string
): Promise<{ research: CompanyResearch; contact: ContactResult | null }> {
  const research = await researchCompany(companyName)
  if (!research.ceoName || !research.domain) {
    return { research, contact: null }
  }
  const contact = await findEmail(research.domain, research.ceoName)
  return { research, contact }
}
